<?php
/**
 * WikiBokJs
 *  -- AjaxExportRequestに対応する関数群
 */
require_once("config/setting.php");
require_once("class/RevisionDB.class.php");
require_once("class/BokXml.class.php");
require_once("class/BokXmlMerger.class.php");

class WikiBokJs {
	/**
	 * アカウント新規作成
	 */
	private function createAccount($name,$pass,$email,$realName) {
		global $wgUser, $wgOut;
		global $wgEnableSorbs, $wgProxyWhitelist;
		global $wgMemc, $wgAccountCreationThrottle;
		global $wgAuth, $wgMinimalPasswordLength;
		global $wgEmailConfirmToEdit;

		# Check permissions
		if ( !$wgUser->isAllowed( 'createaccount' ) ) {
			//Account作成が許可されていない
			//$this->userNotPrivilegedMessage();
			return false;
		} elseif ( $wgUser->isBlockedFromCreateAccount() ) {
			//Account作成がBlockされている
			//$this->userBlockedMessage();
			return false;
		}

		$ip = wfGetIP();
		if ( $wgEnableSorbs && !in_array( $ip, $wgProxyWhitelist ) && $wgUser->inSorbsBlacklist( $ip ) )
		{
			//リクエストIPがBlackList
			//$this->mainLoginForm( wfMsg( 'sorbs_create_account_reason' ) . ' (' . htmlspecialchars( $ip ) . ')' );
			return;
		}

		# Now create a dummy user ($u) and check if it is valid
		$name = trim( $name );
		$u = User::newFromName( $name, 'creatable' );
		//作成済み
		if ( 0 != $u->idForName() ) {
			//$this->mainLoginForm( wfMsg( 'userexists' ) );
			return false;
		}

		# check for minimal password length
		if ( !$u->isValidPassword( $pass ) ) {
			//$this->mainLoginForm( wfMsgExt( 'passwordtooshort', array( 'parsemag' ), $wgMinimalPasswordLength ) );
			return false;
		}

		# if you need a confirmed email address to edit, then obviously you
		# need an email address.
		if ( $wgEmailConfirmToEdit && empty( $email ) ) {
			return false;
		}

		if( !empty( $email ) && !User::isValidEmailAddr( $email ) ) {
			//$this->mainLoginForm( wfMsg( 'invalidemailaddress' ) );
			return false;
		}

		# Set some additional data so the AbortNewAccount hook can be used for
		# more than just username validation
		$u->setEmail( $email );
		$u->setRealName( $realName );

		if( !$wgAuth->addUser( $u, $pass, $email, $realName ) ) {
			//$this->mainLoginForm( wfMsg( 'externaldberror' ) );
			return false;
		}

		return self::initUser( $u, $pass, $email, $realName, false );
	}
	/**
	 * ユーザーデータ新規追加
	 * @param	$u			Userインスタンス
	 * @param	$pass		パスワード	
	 * @param	$email		メールアドレス
	 * @param	$realName	本名
	 * @param	$autocreate	自動作成フラグ
	 */
	private function initUser( $u, $pass, $email, $realName, $autocreate ) {
		global $wgAuth;
		//データ登録
		$u->addToDatabase();
		//パスワード変更権限の確認
		if ( $wgAuth->allowPasswordChange() ) {
			$u->setPassword( $pass );
		}
		//追加項目の設定
		$u->setEmail( $email );
		$u->setRealName( $realName );
		$u->setToken();
		//権限設定
		$wgAuth->initUser( $u, $autocreate );
		$u->saveSettings();
		//ユーザー件数の修正
		$ssUpdate = new SiteStatsUpdate( 0, 0, 0, 0, 1 );
		$ssUpdate->doUpdate();

		return $u;
	}
	/**
	 * パスワード変更
	 * @param	$name	ユーザID
	 * @param	$pass	新規パスワード
	 */
	public static function changePass($name,$pass) {
		global $wgScriptPath;
		//Client-PHPのパスが設定されていない場合を考慮
		$com = realpath(PHPCOM);
		//Mediawikiのメンテナンススクリプトを利用
		$path = realpath($_SERVER["DOCUMENT_ROOT"] . $wgScriptPath."/maintenance/");
		//実行するコマンドラインを整形
		$cmd = "{$com} -f {$path}/changePassword.php -- --user=\"".$name."\" --password=\"".$pass."\"";
		//出力内容を初期化
		$outdata = "";
		$ret = exec($cmd,$outdata,$ret);
		if(empty($outdata)) {
			$result = array('res' => true);
		}
		else {
			$result = array('res'=>false,'message'=>implode('\n',$outdata));
		}
		return json_encode($result);
	}
	/**
	 * ユーザアカウント作成
	 * @param	$name		ユーザID
	 * @param	$pass		パスワード
	 * @param	$email		メールアドレス
	 * @param	$realname	本名
	 */
	public static function createUserAccount($name,$pass,$email,$realname) {
		global $wgUser,$wgEmailAuthentication,$wgAuth;
		$result = array('res'=>false);
		//ユーザーIDチェック
		if(!User::isCreatableName($name)) {
			//使用できないユーザーID(使用できない文字または作成済み)
			$result['message'] = wfMsg('wikibok-error-usercreate-bad-userid');
			return json_encode($result);
		}
		// Create the account and abort if there's problem doing so
		$u = User::newFromName($name, 'creatable');
		if( !is_object($u) ) {
			$result['message'] = wfMsg('wikibok-error-usercreate-bad-userid');
			return json_encode($result);
		} elseif( 0 != $u->idForName() ) {
			$result['message'] = wfMsg('wikibok-error-usercreate-already');
			return json_encode($result);
		}
		//パスワードチェック
		if(!$u->isValidPassword($pass)) {
			$result['message'] = wfMsg('wikibok-error-usercreate-bad-userpass');
			return json_encode($result);
		}
		//アカウント作成実行
		$u = self::createAccount($name,$pass,$email,$realname);
		//ログ出力
		if( $u !== NULL ) {
			$u->addNewUserLogEntry();
			$result = array('res'=>true);
		}
		return json_encode($result);
	}
	/**
	 * SVG形式のデータをPDFへ変換する
	 * @param	$svg	SVGデータ(XMLのヘッダは不要)
	 */
	public static function svg2pdf($svg) {
		set_time_limit(0);
		$com = SVGCONVERT_CMD;
		$path = realpath(SVGCONVERT_FOLDER);
		chdir($path);
		//一時ファイル名を作成
		$key = md5(mt_rand(0,9).date("YmdHis"));
		//ファイルへ出力
		$infile = "{$key}.svg";
		$fp = fopen($infile,"w");
		//外部CSSを適用...
		fwrite($fp,'<?xml version="1.0" encoding="UTF-8" ?>');
		fwrite($fp,'<?xml-stylesheet type="text/css" href="'.SVGCSS_FILE.'"?>');
		fwrite($fp,$svg);
		fclose($fp);

		//A4用紙サイズになるように縮小率を設定する
		//縮小率の初期化
		$z = "1.00";
		if(preg_match('/viewBox="([.0-9 ]+)"/',$svg,$viewbox) == 1) {
			//SVG表示領域の取得
			$view = $viewbox[1];
			preg_match_all('/[0-9]+/',$view,$size);
			if(is_array($size)) {
				$x = (isset($size[0][0]))?$size[0][0]:0;
				$y = (isset($size[0][1]))?$size[0][1]:0;
				$w = (isset($size[0][2]))?$size[0][2]:1;
				$h = (isset($size[0][3]))?$size[0][3]:1;
				//縮小のみとなるように用紙サイズを超えるときのみ値を設定
				$wz = ($w >= SVGCONVERT_A4W) ? (SVGCONVERT_A4W / $w) : 1;
				$wh = ($h >= SVGCONVERT_A4H) ? (SVGCONVERT_A4H / $h) : 1;
				//小さい方に合わせて縮小する(ついでに整形)
				$z = sprintf("%0.2lf",(($wz > $wh) ? $wh : $wz));
			}
		}

		$outfile = "{$key}.pdf";
		//PDF変換コマンド
		$cmd  = "cd \"{$path}\" | {$com} -f pdf -z {$z} -o \"{$outfile}\" \"{$infile}\"";
		//実行結果(標準出力)にSVGデータが出力される
		$outdata = "";
		$ret = exec($cmd,$outdata,$ret);
		//SVGファイルを削除
		unlink($infile);
		return json_encode(array("res"=>$ret,"outfile"=>$outfile));
	}
	/**
	 * svg2pdf関数で作成したPDFファイルをダウンロードする
	 * @param	$f	ファイル名称
	 */
	public static function download_pdf($f) {
		//セキュリティを考慮してダウンロード対象のフォルダを固定
		//フルパスでの指定を考慮してパラメータからフォルダ情報を切り捨てる
		$path = realpath(SVGCONVERT_FOLDER);
		$file = basename($f);
		$path_file = "{$path}/{$file}";
		//出力をバッファリングする
		ob_start();
		//ファイルの存在確認
		if (!file_exists($path_file)) {
			die("Error: File(".$path_file.") does not exist");
		}
		//オープンできるか確認
		if (!($fp = fopen($path_file, "r"))) {
			die("Error: Cannot open the file(".$path_file.")");
		}
		fclose($fp);
		//ファイルサイズの確認
		if (($content_length = filesize($path_file)) == 0) {
			die("Error: File size is 0.(".$path_file.")");
		}
		//ダウンロードファイル名を設定(プレフィックス+日付とする)
		$downfilename = date("Ymd_His").".pdf";
		//ダウンロード用のHTTPヘッダ送信
		header("Content-Type: application/octet-stream");
		header("Content-Disposition: attachment; filename=\"".$downfilename."\"");
		header("Content-Length: ".$content_length);
		//ファイルを読んで出力
		if (!readfile($path_file)) {
			die("Cannot read the file(".$path_file.")");
		}
		ob_end_flush();
		//ダウンロードが終わったファイルは削除(設定で変更できたほうがよい?)
		unlink($path_file);
		return true;
	}
	/**
	 * BOK-XMLデータ保存用DBへの接続を取得
	 * @param $user	ログインユーザID
	 */
	private static function getDB() {
		//BOKデータベースへ接続
		$db = new RevisionDB();
		return $db;
	}
	/**
	 * Bokツリーの表示データ取得
	 */
	public static function getBokJson($rev="",$user="") {
		//BOKデータベースへ接続
		$db = self::getDB();
		//なるべく最新データを取得する
		//  BOKへのノード追加などを考慮し、編集中データがある場合はそちらを優先...
		if($user != "") {
			$db->setUser($user);
			$data = $db->getEditData($rev);
		}
		else {
			$data = $db->getBokRev($rev);
		}
		if($data !== FALSE) {
			$rev = $data['rev'];
			$bok = new BokXml($data['bok']);
		}
		else {
			$rev = 0;
			$bok = new BokXml();
		}
		//Javascriptで処理するため、宣言文を削除
		$xml = preg_replace('/^[^\n]+\n/i','',$bok->saveXML(),1);
		return json_encode(array('act'=>$rev,'xml'=>$xml));
	}
	/**
	 * リビジョン情報取得
	 *   - 編集者の編集リビジョン番号は取得しない
	 *
	 * @param	$user	ユーザ名称(ID可)
	 * @return	{ base : [編集元リビジョン]
	 *			  head : [最新リビジョン]
	 *			  edit : [編集中フラグ] }
	 */
	public static function getBokRevision($user="") {
		$edit = true;
		//BOKデータベースへ接続
		$db = self::getDB();
		$db->setUser($user);
		$head = $db->getBokHead();
		$base = $db->getUserBase();
		if($base === FALSE) {
			$edit = false;
			$base = $head;
		}
		else {
			$uh = $db->getUserHead();
		}
		return json_encode(array(
			'base' => isset($base['rev']) ? $base['rev'] : 0,
			'head' => isset($head['rev']) ? $head['rev'] : 0,
			'user' => (isset($uh) && isset($uh['rev'])) ? $uh['rev'] : (isset($head['rev']) ? $head['rev'] : 0),
			'edit' => $edit,
		));
	}
	/**
	 * BOK-XMLへ追加前のDescriptionEditorに表示されているデータ
	 */
	public static function getDescriptionList($rev="",$user="") {
		//BOKデータベースへ接続
		$db = self::getDB();
		//なるべく最新データを取得する
		//  BOKへのノード追加などを考慮し、編集中データがある場合はそちらを優先...
		if($user != "") {
			$db->setUser($user);
			$boktree = $db->getUserHead();
			if($boktree === FALSE) {
				//ユーザー編集データがないので最新BOKを取得
				$boktree = $db->getBokHead();
			}
		}
		else {
			$boktree = $db->getBokHead();
		}
		$rev = $boktree["rev"];
		$xml = new BokXml($boktree["bok"]);
		$bok_names = $xml->getNodeTree();

		//Descriptionノードを追加
		$dbr = wfGetDB(DB_SLAVE);
		$page = $dbr->tableName('page');
		//Descriptionノードのページデータを取得
		$rows = $dbr->select($page,
								array('page_id','page_title'),
								array('page_namespace' => NS_SPECIAL_DESCRIPTION),
								__METHOD__
							);
		$desc = array();
		$_desc = array();
		if($dbr->numRows($rows) > 0) {
			while($row = $dbr->fetchObject($rows)) {
				$i = $row->page_id;
				$v = $row->page_title;
				//ページ名なし/BOKへ追加済みは出力しない
				if($v == '' || array_key_exists($v,$bok_names)) {
					continue;
				}
				$desc[] = array('id'=>$i,'name'=>$v,'type'=>'desc');
				$_desc[$v] = true;
			}
		}
		//リンク先としてのみ作成されいるものを追加
		//Wikiデータベースへ接続
		$smw_ids = $dbr->tableName('smw_ids');
		$smw_rels2 = $dbr->tableName('smw_rels2');
		//SMWリンクデータを取得
		$query = 
		'SELECT s_id.smw_namespace subject_namespace,'.
		'       s_id.smw_title s,'.
		'       p_id.smw_title p,'.
		'       o_id.smw_title o,'.
		'       s_id.smw_id s_id,'.
		'       p_id.smw_id p_id,'.
		'       o_id.smw_id o_id '.
		'  FROM '.$smw_ids.' s_id '.
		'  JOIN '.$smw_rels2.' s_rel ON s_id.smw_id = s_rel.s_id '.
		'  JOIN '.$smw_ids.' p_id ON s_rel.p_id = p_id.smw_id'.
		'  JOIN '.$smw_ids.' o_id ON s_rel.o_id = o_id.smw_id '.
		' WHERE o_id.smw_namespace = '.NS_SPECIAL_DESCRIPTION.
		' ORDER BY s_id.smw_id,p_id.smw_id,o_id.smw_id ';
		$res = $dbr->query($query);
		if($dbr->numRows($res) > 0) {
			while($row = $dbr->fetchObject($res)) {
				$v = "{$row->o}";
				if($v == '' || array_key_exists($v,$_desc)) {
					continue;
				}
				$desc[] = array('id'=>0,'name'=>$v,'type'=>'desc');
			}
		}
		return json_encode($desc);
	}
	/**
	 * DescriptionEditor表示データの取得
	 */
	public static function getDescriptionJson($rev="",$user="") {
		//戻り値初期化
		$link = array();
		$node = array();

		//BOK-XML用データベースへ接続
		$db = self::getDB();
		$bHead = $db->getBokHead();
		$bBok = new BokXml($bHead['bok']);
		if($user != "") {
			$db->setUser($user);
			$uHead = $db->getUserHead();
			$uBok = new BokXml($uHead['bok']);
		}
		//Javascriptで処理するため、宣言文を削除
		$base_xml = preg_replace('/^[^\n]+\n/i','',$bBok->saveXML(),1);
		$user_xml = preg_replace('/^[^\n]+\n/i','',$uBok->saveXML(),1);
		
		//Wikiデータベースへ接続
		$dbr = wfGetDB(DB_SLAVE);
		$smw_ids = $dbr->tableName('smw_ids');
		$smw_rels2 = $dbr->tableName('smw_rels2');
		//SMWリンクデータを取得
		$query = 
		'SELECT s_id.smw_namespace subject_namespace,'.
		'       s_id.smw_title s,'.
		'       p_id.smw_title p,'.
		'       o_id.smw_title o,'.
		'       s_id.smw_id s_id,'.
		'       p_id.smw_id p_id,'.
		'       o_id.smw_id o_id '.
		'  FROM '.$smw_ids.' s_id '.
		'  JOIN '.$smw_rels2.' s_rel ON s_id.smw_id = s_rel.s_id '.
		'  JOIN '.$smw_ids.' p_id ON s_rel.p_id = p_id.smw_id'.
		'  JOIN '.$smw_ids.' o_id ON s_rel.o_id = o_id.smw_id '.
		' WHERE o_id.smw_namespace = '.NS_SPECIAL_DESCRIPTION.
		' ORDER BY s_id.smw_id,p_id.smw_id,o_id.smw_id ';
		$res = $dbr->query($query);
		if($dbr->numRows($res) > 0) {
			while($row = $dbr->fetchObject($res)) {
				$link[] = array(
					'source' => "{$row->s}",
					'target' => "{$row->o}",
//					'type' => "smw",
					'linkName' => "{$row->p}"
				);
			}
		}
		$dbr->freeResult($res);
		return json_encode(array('basexml'=>$base_xml,'userxml'=>$user_xml,'smwlink'=>$link));
	}
	/**
	 * SMWLink取得
	 *  - 複数個所で利用するため、privateにしてまとめる...
	 * @param $desc		記事名称
	 * @param $lname	関係名称(省略可)
	 */
	private function getSMWLink($desc,$lname="") {
		$dbr = wfGetDB(DB_SLAVE);
		//SMWテーブル名称取得
		$smw_rels2 = $dbr->tableName('smw_rels2');
		$smw_ids = $dbr->tableName('smw_ids');
		//SMWリンクを出力
		$query ='SELECT s_id.smw_title s,'.
				'       p_id.smw_title p,'.
				'       o_id.smw_title o '.
				'  FROM '.$smw_ids.' s_id '.
				'  JOIN '.$smw_rels2.' s_rel ON s_id.smw_id = s_rel.s_id '.
				'  JOIN '.$smw_ids.' o_id ON s_rel.o_id = o_id.smw_id '.
				'  JOIN '.$smw_ids.' p_id ON s_rel.p_id = p_id.smw_id'.
				' WHERE s_id.smw_title = '.$dbr->addQuotes( $desc ).
				'   AND s_id.smw_namespace = '.NS_SPECIAL_DESCRIPTION.
				'   AND o_id.smw_namespace = '.NS_SPECIAL_DESCRIPTION;
		if(!empty($lname)) {
			//関係名称が指定されている場合
			$query .= '   AND p_id.smw_title = '.$dbr->addQuotes($lname);
		}
		$links = array();
		$rows = $dbr->query($query);
		if($dbr->numRows($rows) > 0) {
			while($row = $dbr->fetchObject($rows)) {
				$links[] = array(
					'source' => "{$row->s}",
					'target' => "{$row->o}",
					'type' => "smw",
					'linkName' => "{$row->p}"
				);
			}
		}
		$dbr->freeResult($rows);
		return $links;
	}
	/**
	 * SMWLinkの取得
	 * @param $desc		記事名称
	 * @param $lname	関係名称(省略可)
	 */
	public static function getSMWLinks($desc,$lname="") {
		$links = self::getSMWLink($desc,$lname);
		$result = (count($links) > 0);
		return json_encode(array('res'=>$result,'data'=>$links));
	}
	/**
	 * SMWリンクの対象になっているかチェックする
	 * @param $name		記事名称
	 * @param $linkname	関係名称
	 */
	public static function checkSMWLinkTarget($name,$linkname) {
		$res = self::_checkSMWLinkTarget($name,$linkname);
		return json_encode($res);
	}
	/**
	 * SMWリンクの対象になっているかチェックする
	 * @param $name		記事名称
	 * @param $linkname	関係名称
	 */
	private function _checkSMWLinkTarget($name,$linkname) {
		$dbr = wfGetDB(DB_SLAVE);
		//SMWテーブル名称取得
		$smw_rels2 = $dbr->tableName('smw_rels2');
		$smw_ids = $dbr->tableName('smw_ids');
		//SMWリンクを出力
		$query ='SELECT s_id.smw_title s,'.
				'       p_id.smw_title p,'.
				'       o_id.smw_title o '.
				'  FROM '.$smw_ids.' s_id '.
				'  JOIN '.$smw_rels2.' s_rel ON s_id.smw_id = s_rel.s_id '.
				'  JOIN '.$smw_ids.' o_id ON s_rel.o_id = o_id.smw_id '.
				'  JOIN '.$smw_ids.' p_id ON s_rel.p_id = p_id.smw_id'.
				' WHERE o_id.smw_title = '.$dbr->addQuotes($name).
				'   AND s_id.smw_namespace = '.NS_SPECIAL_DESCRIPTION.
				'   AND o_id.smw_namespace = '.NS_SPECIAL_DESCRIPTION.
				'   AND p_id.smw_title = '.$dbr->addQuotes($linkname);
		$links = array();
		$rows = $dbr->query($query);
		$res = ($dbr->numRows($rows) > 0);
		$dbr->freeResult($rows);
		return $res;
	}
	/**
	 * 代表表現先として設定されているノード情報を取得(一括)
	 */
	private function getRepresentTarget() {
		$links = array();
		if(defined('BOK_REPRESENT_EDIT') && BOK_REPRESENT_EDIT) {
			$dbr = wfGetDB(DB_SLAVE);
			//SMWテーブル名称取得
			$smw_rels2 = $dbr->tableName('smw_rels2');
			$smw_ids = $dbr->tableName('smw_ids');
			//SMWリンクを出力
			$query ='SELECT DISTINCT o_id.smw_title o '.
					'  FROM '.$smw_ids.' s_id '.
					'  JOIN '.$smw_rels2.' s_rel ON s_id.smw_id = s_rel.s_id '.
					'  JOIN '.$smw_ids.' o_id ON s_rel.o_id = o_id.smw_id '.
					'  JOIN '.$smw_ids.' p_id ON s_rel.p_id = p_id.smw_id'.
					' WHERE s_id.smw_namespace = '.NS_SPECIAL_DESCRIPTION.
					'   AND o_id.smw_namespace = '.NS_SPECIAL_DESCRIPTION;
			if(defined('BOK_LINKTYPE_REPRESENT')) {
				$query .= ' AND p_id.smw_title = '.$dbr->addQuotes(BOK_LINKTYPE_REPRESENT);
			}
			$rows = $dbr->query($query);
			if($dbr->numRows($rows) > 0) {
				while($row = $dbr->fetchObject($rows)) {
					$link = $row->o;
					$links[$link] = $link;
				}
			}
			$dbr->freeResult($rows);
		}
		return $links;
	}


	/**
	 * BOK-XMLのノード名称を変更
	 * @param $rev	変更元リビジョン番号
	 * @param $user	変更ユーザID
	 * @param $from	変更前のノード名
	 * @param $to	変更後のノード名
	 */
	public static function renameNodeRequest($rev,$user,$from,$to) {
		$represent = false;
		$res = array();
		//変更後のノード名称が代表表現の従属に使用されている場合、リネーム不可
		if(defined('BOK_REPRESENT_EDIT') && (BOK_REPRESENT_EDIT)) {
			if(self::_checkSMWLinkTarget($to,BOK_LINKTYPE_REPRESENT)) {
				$represent = true;
			}
		}
		if($represent) {
			$res['res'] = false;
			$res['message'] = '代表表現の従属ノードとして使用されています';
		}
		else {
			$db = self::getDB();
			$db->setUser($user);
			$data = $db->getEditData($rev);
			if($data !== false) {
				$boktree = $data["bok"];
				$rev = $data["rev"];
				$xml = new BokXml($boktree);
			}
			else {
				$rev = 0;
				$xml = new BokXml();
			}
			if($xml->renameNode($from,$to)) {
				$new_bok = $xml->saveXML();
				$res['act'] = $db->setEditData($rev,$new_bok);
				$res['res'] = true;
			}
			else {
				$res['res'] = false;
				$res['message'] = 'XML操作失敗';
			}
		}
		return json_encode($res);
	}
	/**
	 * 代表表現編集データに仮登録 + 対象ノード削除
	 * @param $rev	編集元リビジョン番号
	 * @param $user	ユーザID
	 * @param $rows	代表表現対象データ(配列)
	 */
	public static function representNodeRequest($rev,$user,$rows) {
		$db = self::getDB();
		$db->setUser($user);
		$data = $db->getEditData($rev);
		if($data !== false) {
			$boktree = $data["bok"];
			$rev = $data["rev"];
			$xml = new BokXml($boktree);
		}
		else {
			$rev = 0;
			$xml = new BokXml();
		}
		//BOK-XMLデータの変更
		foreach($rows as $row) {
			//代表表現の従属ノードのデータを、とりあえず移動
			$xml->moveNode($row['child'],$row['parent']);
			//設定により従属ノード配下のデータの扱いを変更する
			if(defined(BOKXML_REPRESENT_CHILD_DELETE)) {
				if(BOKXML_REPRESENT_CHILD_DELETE) {
					//配下も含めて削除
					$xml->delNode($row['child']);
				}
				else {
					//自分のみ削除(配下は代表ノードの下へ移動)
					$xml->delNodeOnly($row['child']);
				}
			}
			else {
				//自分のみ削除(配下は代表ノードの下へ移動)
				$xml->delNodeOnly($row['child']);
			}
		}
		//XMLデータを設定
		$res = $db->setEditData($rev,$xml->saveXML());
		//代表表現情報の書き込み
		$res_row = array();
		foreach($rows as $row) {
			$db->setRepresentData(array(
				'rev' => $res,
				'source'=>$row['source'],
				'target'=>$row['target']
			));
			$res_row[] = array(
				'rev' => $res,
				'source'=>$row['source'],
				'target'=>$row['target']
			);
		}
		$result['res'] = $res;
		return json_encode($result);
	}
	/**
	 * 代表表現設定用SMW-LINK文字列取得
	 * @param $rev	コミット時のリビジョン番号
	 * @param $user	ユーザID
	 * @param $desc	記事名称
	 */
	public static function representLinkData($rev,$user) {
		$db = self::getDB();
		$db->setUser($user);
		$rows = $db->getRepresentData($rev);
		$res = array(
			'res' => (count($rows) > 0),
			'data' => $rows
		);
		//必要なデータは取得したので、クリア
		$db->clearRepresentData();
		return json_encode($res);
	}
	/**
	 * ノードを作成する
	 
	 * @param	$rev	編集対象リビジョン
	 * @param	$user	編集ユーザ
	 * @param	$name	ノード名称
	 */
	public static function createNodeRequest($rev,$user,$name) {
		//BOKデータベースへ接続
		$db = self::getDB();
		$db->setUser($user);
		$data = $db->getEditData($rev);
		if($data !== false) {
			$boktree = $data["bok"];
			$rev = $data["rev"];
			$xml = new BokXml($boktree);
		}
		else {
			$rev = 0;
			$xml = new BokXml();
		}
		//ノード作成
		$new_bok = $xml->addNode($name);
		if($new_bok === FALSE) {
		//作成失敗
			$result['res'] = false;
			$result['b']   = nl2br(wfMsg('wikibok-bokeditor-error-new-element-added'));
		}
		else {
			//編集済みデータをユーザーテーブルへ登録
			$res = $db->setEditData($rev,$new_bok);
			$result['res'] = $res;
		}
		return json_encode($result);
	}
	/**
	 * 指定ノード配下に新規ノードを作成する
	 * @param	$rev	編集対象リビジョン
	 * @param	$user	編集ユーザ
	 * @param	$child	追加ノード名称
	 * @param	$parent	親ノード名称
	 */
	public static function createNodeToRequest($rev,$user,$child,$parent) {
		//BOKデータベースへ接続
		$db = self::getDB();
		$db->setUser($user);
		$data = $db->getEditData($rev);
		if($data !== false) {
			$boktree = $data["bok"];
			$rev = $data["rev"];
			$xml = new BokXml($boktree);
		}
		else {
			$rev = 0;
			$xml = new BokXml();
		}
		if(is_array($child)) {
			//指定ノード配下に新規ノードを追加
			foreach($child as $_child) {
				$new_bok = $xml->addNodeTo($_child,$parent);
				if($new_bok === FALSE) {
					//追加後に失敗した場合は考慮外
					$result['res'] = false;
					$result['b']   = nl2br(wfMsg('wikibok-bokeditor-error-new-element-added')).'['.$_child.']';
					break;
				}
			}
		}
		else{
			//指定ノード配下に新規ノードを追加
			$new_bok = $xml->addNodeTo($child,$parent);
		}
		if($new_bok === FALSE) {
			//追加後に失敗した場合は考慮外
			$result['res'] = false;
			$result['b']   = nl2br(wfMsg('wikibok-bokeditor-error-new-element-added'));
		}
		else {
			$res = $db->setEditData($rev,$new_bok);
			$result['res'] = $res;
		}
		return json_encode($result);
	}
	/**
	 * ノードの移動処理
	 * @param	$rev	編集対象リビジョン
	 * @param	$user	編集ユーザ
	 * @param	$child	移動対象ノード名称
	 * @param	$parent	新しい親ノード名称
	 */
	public static function moveNodeRequest($rev,$user,$child,$parent) {
		//BOKデータベースへ接続
		$db = self::getDB();
		$db->setUser($user);
		$data = $db->getEditData($rev);
		if($data !== false) {
			$boktree = $data["bok"];
			$rev = $data["rev"];
			$xml = new BokXml($boktree);
		}
		else {
			$rev = 0;
			$xml = new BokXml();
		}
		$new_bok = $xml->moveNode($child,$parent);
		if($new_bok === FALSE) {
			//追加後に失敗した場合は考慮外
			$result['res'] = false;
			$result['b']   = nl2br(wfMsg('wikibok-bokeditor-error-hierarchy-change'));
		}
		else {
			$res = $db->setEditData($rev,$new_bok);
			$result['res'] = $res;
		}
		return json_encode($result);
	}
	/**
	 * エッジの削除処理
	 *   - 対象ノードを疑似ルートへ移動する
	 * @param	$rev	編集対象リビジョン
	 * @param	$user	編集ユーザ
	 * @param	$target	対象ノード名称
	 */
	public static function deleteEdgeRequest($rev,$user,$target) {
		//BOKデータベースへ接続
		$db = self::getDB();
		$db->setUser($user);
		$data = $db->getEditData($rev);
		if($data !== false) {
			$boktree = $data["bok"];
			$rev = $data["rev"];
			$xml = new BokXml($boktree);
		}
		else {
			$rev = 0;
			$xml = new BokXml();
		}
		$new_bok = $xml->delEdge($target);
		if($new_bok === FALSE) {
			//追加後に失敗した場合は考慮外
			$result['res'] = false;
			$result['b']   = nl2br(wfMsg('wikibok-bokeditor-error-hierarchy-change'));
		}
		else {
			$res = $db->setEditData($rev,$new_bok);
			$result['res'] = $res;
		}
		return json_encode($result);
	}
	/**
	 * ノード削除処理
	 * @param	$rev	編集対象リビジョン
	 * @param	$user	編集ユーザ
	 * @param	$name	対象ノード名称
	 */
	public static function deleteNodeRequest($rev,$user,$name) {
		//BOKデータベースへ接続
		$db = self::getDB();
		$db->setUser($user);
		$data = $db->getEditData($rev);
		if($data !== false) {
			$boktree = $data["bok"];
			$rev = $data["rev"];
			$xml = new BokXml($boktree);
		}
		else {
			$rev = 0;
			$xml = new BokXml();
		}
		$new_bok = $xml->delNode($name);
		if($new_bok === FALSE) {
			//追加後に失敗した場合は考慮外
			$result['res'] = false;
			$result['b']   = nl2br(wfMsg('wikibok-bokeditor-error-hierarchy-change'));
		}
		else {
			$res = $db->setEditData($rev,$new_bok);
			$result['res'] = $res;
		}
		return json_encode($result);
	}
	/**
	 * ノード削除処理(配下のノードは削除しない)
	 * @param	$rev	編集対象リビジョン
	 * @param	$user	編集ユーザ
	 * @param	$name	対象ノード名称
	 */
	public static function deleteNodeOnlyRequest($rev,$user,$name) {
		//BOKデータベースへ接続
		$db = self::getDB();
		$db->setUser($user);
		$data = $db->getEditData($rev);
		if($data !== false) {
			$boktree = $data["bok"];
			$rev = $data["rev"];
			$xml = new BokXml($boktree);
		}
		else {
			$rev = 0;
			$xml = new BokXml();
		}
		$new_bok = $xml->delNodeOnly($name);
		if($new_bok === FALSE) {
			//追加後に失敗した場合は考慮外
			$result['res'] = false;
			$result['b']   = nl2br(wfMsg('wikibok-bokeditor-error-hierarchy-change'));
		}
		else {
			$res = $db->setEditData($rev,$new_bok);
			$result['res'] = $res;
		}
		return json_encode($result);
	}
	/**
	 * 編集競合解決処理
	 * @param	$rev	編集リビジョン
	 * @param	$user	ユーザー名
	 */
	public static function treeway_merge($rev,$user) {
		$ret = array();
		//ログインしていない場合は処理しない
		if($user == '') {
			$ret['res'] = 'no permision';
			$ret['conflict_type'] = 'no conflict';
		}
		else {
			//BOKデータベースへ接続
			$db = self::getDB();
			$db->setUser($user);
			//3Way-Merge用にデータベースのデータを取得
			$base = $db->getUserBase();		//編集開始時のデータ
			$head = $db->getBokHead();		//現在の最新データ
			$work = $db->getUserRev($rev);	//編集終了時のデータ
			//リビジョン番号をもとに、マージが必要か確認...
			$base_rev = $base['rev'];
			$head_rev = $head['rev'];
			$work_rev = $work['rev'];
			if($base_rev == $work_rev) {
				//自身の編集なし(マージ不要)
				$ret['res'] = 'no edit';
			}
			else {
				//マージ処理開始
				$merger = new BokXmlMerger();
				$type = $merger->checkMerge($base['bok'],$head['bok'],$work['bok']);
				if($type === false) {
					//引っかからない場合：競合なし[NO CONFLICT]はFLASEではない
					$ret['res'] = 'no merge';
				}
				else {
					$link = self::getRepresentTarget();
					list($_xml,$eSet) = $merger->doMerge($type,$link);
					////テスト用データ登録をスキップするため...
					//$ret['res'] = 'no permision';
					//競合発生の記録を保管
					$conflict_data = array(
						'type' => $type,
						'base_rev' => $base_rev,
						'head_rev' => $head_rev,
						'work_xml' => $work['bok'],
						'merge_rev' => $merger->getMergeRev()
					);
					$db->setEditConflict($conflict_data);
					//データ登録指示(一度Clientへ処理を戻す)
					$ret['res'] = 'insert';
					//競合タイプを返却
					$ret['conflict_type'] = $type;
					//登録用のリビジョン番号を設定
					$ret['newRev'] = $head_rev + 1;
					//$ret['newBok'] = $_xml;
					//マージ結果をクライアントへ送信せず、DBのUserDataに格納する
					$db->setMergeTemporary($_xml);
					$ret['newBok'] = '';
					$ret['eSet'] = $eSet;
				}
			}
		}
		return json_encode($ret);
	}
	/**
	 * BOK-XML登録
	 * @param	$user	ユーザーID
	 * @param	$rev	登録用リビジョン番号(競合解消時の最新BOKリビジョン+1)
	 * @param	$bok	登録用BOK-XML(競合解消済みXML文字列)
	 * @param	$eSet	編集情報(最新<=>登録用の差分/実際のEditSetとは異なる)
	 */
	public static function insertMergeXml($rev,$user,$bok="",$eSet="") {
		//BOKデータベースへ接続
		$db = self::getDB();
		$db->setUser($user);
		//編集内容設定
		$eSet = (empty($eSet)) ? array(): $eSet;
		//指定リビジョンにデータを登録
		if(empty($bok)) {
			$bok = $db->getMergeTemporary();
		}
		$res = $db->setBokData($rev,$bok,$eSet);
		$result = array();
		if($res === FALSE) {
			//登録失敗 => 最新データが異なるため再度、競合解消から行う
			$result['res'] = false;
		}
		else {
			//登録成功
			$result['res'] = 'merge complete';
			//USER編集情報クリア
			$db->clearEditData();
			$result['eSet'] = $eSet;
		}
		return json_encode($result);
	}
	/**
	 * ユーザーの編集データを消去する
	 * @param	$user	ユーザーID
	 */
	public static function clearEditHistory($rev,$user) {
		//BOKデータベースへ接続
		$db = self::getDB();
		$db->setUser($user);
		$db->clearEditData();
		return json_encode(true);
	}
	/**
	 * 編集中のユーザデータを保存
	 * @param $rev		編集元のリビジョン番号
	 * @param $user		ユーザID
	 * @param $title	保存用名称
	 * @param $comment	保存用コメント
	 */
	public static function saveBokSvgData($rev,$user,$title,$comment) {
		//BOKデータベースへ接続
		$db = self::getDB();
		$db->setUser($user);
		//保存するXMLデータを取得
		$save_data = $db->getEditData($rev);
		if($save_data === false) {
			return json_encode(false);
		}
		//個人編集前のデータを取得
		$base_data = $db->getUserBase();
		if($base_data === false) {
			$base_rev = $rev;
		}
		else {
			$base_rev = $base_data['rev'];
		}
		//データ登録
		$res = $db->saveBokData(array(
				'base_rev' => $base_rev,
				'bok_xml' => $save_data['bok'],
				'title' =>$title,
				'comment' =>$comment
			));
		if($res === false) {
			return json_encode($res);
		}
		else {
			//接続用パラメータを返却...
			return json_encode(http_build_query(array(
				'action'=>'load',
				'title'=>$title,
				'user'=>$user,
			)));
		}
	}
	/**
	 * 保存済みBOK-XMLデータを取得する
	 */
	public static function viewData($user,$title) {
		//BOKデータベースへ接続
		$db = self::getDB();
		$db->setUser($user);
		$data = $db->loadBokData($title);
		if($data !== FALSE) {
			$bok = new BokXml($data['bok_xml']);
		}
		else {
			$bok = new BokXml();
		}
		//Javascriptで処理するため、宣言文を削除
		$xml = preg_replace('/^[^\n]+\n/i','',$bok->saveXML(),1);
		return json_encode(array('bok_xml'=>$xml));
	}
	/**
	 * SMWリンクの情報からノードを作成する
	 * @param $r
	 */
	public static function createNodeFromLinks($r,$u,$parent,$nodes,$l) {
		//SMWリンクデータを取得
		if(is_array($nodes)) {
			//複数ノードを指定した場合
			$links = array();
			foreach($nodes as $node) {
				$links += self::getSMWLink($node,$l);
			}
		}
		else {
			$links = self::getSMWLink($nodes,$l);
		}
		//BOKデータベースへ接続/編集用データを取得
		$db = self::getDB();
		$db->setUser($user);
		$data = $db->getEditData($r);
		if($data !== false) {
			$rev = $data['rev'];
			$bok = new BokXml($data['bok']);
		}
		else {
			$rev = 0;
			$bok = new BokXml();
		}
		//リンク先のノードをそれぞれ追加する
		$add = array();
		foreach($links as $link) {
			$t = $link['target'];
			//個別に追加成功/失敗を設定
			$add[$t] = $bok->addNodeTo($t,$parent);
		}
		//追加に成功したノードのみ抽出
		$added = array_filter($add);
		if(count($added) > 0) {
			//編集済みデータをDBへ登録
			$res = $db->setEditData($rev,$bok->saveXML());
			$result = array(
				'rev' => $res,
				'added' => $added
			);
		}
		else {
			//リンクがないもしくはすべて追加済み
			$result = false;
		}
		return json_encode($result);
	}
}
