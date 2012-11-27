<?php
if(!defined("REVISION_DB")) {
	define("REVISION_DB",TRUE);
	define("BOK_TARGET_DB_MAIN","bok_tree");
	define("BOK_TARGET_DB_USER","user_bok_tree");
	define("BOK_TARGET_DB_SAVE","save_bok_tree");
	define("BOK_TARGET_DB_MERGER","merger_class");
	define("BOK_TARGET_DB_REPRESENT","represent_work");
	define("BOK_TARGET_DB_CONFLICT","conflict_log");
	define("BOK_COLUMN_SEP_IDS","\n");
	define("BOK_COLUMN_SEP_PATH","\1");
	define("TABLE_POST_STRING","BOK_TARGET_DB_");
}

class RevisionDB {
	protected $db;
	protected $user;
	protected $data;
	protected $edit;
	/**
	 * コンストラクタ
	 */
	public function __construct() {
		global $wgDBserver,$wgDBname,$wgDBpassword,$wgDBuser;
		$this->__init($wgDBserver,$wgDBname,$wgDBuser,$wgDBpassword);
		$this->user = "";
		if(empty($session)) {
			$this->session = session_id();
		}
		else {
			$this->session = $session;
		}
	}
	/**
	 * ユーザーIDを設定する
	 */
	public function setUser($user,$change=FALSE) {
		if(empty($user) || is_null($user)) {
			$this->user = 0;
		}
		else {
			if(!$change) {
				$this->user = User::idFromName($user);
			}
			else {
				$this->user = $user;
			}
		}
	}
	/**
	 * コミット前(編集中)のBOKデータより、指定リビジョンのデータを取得
	 * @param $rev	指定リビジョン番号
	 */
	public function getUserRev($rev) {
		$name = wfGetDB(DB_SLAVE)->tableName('wbs_userboktree');
		$sql  = 'SELECT * FROM '.$name.'  ';
		//指定リビジョンが最新リビジョンより大きい場合を考慮
		$sql .= ' WHERE (rev <= ? ';
		//指定リビジョンが初回リビジョンより大きい場合を考慮
		$sql .= '    OR  rev = ?)';
		$sql .= '   AND  session_id = ?';
		$sql .= '   AND  user_id = ?';
		$sql .= ' ORDER BY rev DESC ';
		$sql .= ' LIMIT 1';
		$sth = $this->db->prepare($sql);
		$sth->execute(array(
			$rev,
			$rev,
			$this->session,
			$this->user
		));
		$data = $sth->fetch(PDO::FETCH_ASSOC);
		return ($data);
	}
	/**
	 * コミット済みのBOKデータより、指定リビジョンのデータを取得
	 * @param $rev 指定リビジョン番号
	 */
	public function getBokRev($rev="") {
		if(empty($rev)) {
			$data = $this->getBokHead();
		}
		else {
			$name = wfGetDB(DB_SLAVE)->tableName('wbs_boktree');
			$sql  = 'SELECT * FROM '.$name.'  ';
			//指定リビジョンが最新リビジョンより大きい場合を考慮
			$sql .= ' WHERE rev <= ? ';
			//指定リビジョンが初回リビジョンより大きい場合を考慮
			$sql .= '    OR rev = 1 ';
			$sql .= ' ORDER BY rev DESC ';
			$sql .= ' LIMIT 1';
			$sth = $this->db->prepare($sql);
			$sth->execute(array($rev));
			$data = $sth->fetch(PDO::FETCH_ASSOC);
		}
		return ($data);
	}
	/**
	 * コミット済みのBOKデータより、最新リビジョンのデータを取得
	 */
	public function getBokHead() {
		$name = wfGetDB(DB_SLAVE)->tableName('wbs_boktree');
		$sql  = 'SELECT * FROM '.$name.'  ';
		$sql .= ' ORDER BY rev DESC ';
		$sql .= ' LIMIT 1';
		$sth = $this->db->prepare($sql);
		$sth->execute();
		$data = $sth->fetch(PDO::FETCH_ASSOC);
		if($data === FALSE) {
			//データがない場合は、空データをinsertしておく
			$bok = new BokXml();
			$empty_data = array(
				'bok' => $bok->saveXML(),
				'new_ids' => '',
				'del_ids' => '',
				'user_id' => $this->user
			);
			$this->insertMain($empty_data);
			//データの再取得
			$sth->execute();
			$data = $sth->fetch(PDO::FETCH_ASSOC);
		}
		return ($data);
	}
	/**
	 * 対象ユーザーが編集中のデータより、最新のデータを取得
	 */
	public function getUserHead() {
		if($this->getUserEdit()) {
			$name = wfGetDB(DB_SLAVE)->tableName('wbs_userboktree');
			$sql  = 'SELECT * FROM '.$name.'  ';
			$sql .= ' WHERE session_id = ?';
			$sql .= '   AND user_id = ?';
			$sql .= ' ORDER BY rev DESC ';
			$sql .= ' LIMIT 1';
			$sth = $this->db->prepare($sql);
			$sth->execute(array(
				$this->session,
				$this->user
			));
			$data = $sth->fetch(PDO::FETCH_ASSOC);
			return ($data);
		}
		else {
			return (FALSE);
		}
	}
	/**
	 * 対象ユーザーが編集中のデータより、編集開始時点のデータを取得
	 * @param	$user	対象ユーザーID/セッションID
	 */
	public function getUserBase() {
		if($this->getUserEdit()) {
			$name = wfGetDB(DB_SLAVE)->tableName('wbs_userboktree');
			$sql  = 'SELECT * FROM '.$name.'  ';
			$sql .= ' WHERE session_id = ?';
			$sql .= '   AND user_id = ?';
			$sql .= ' ORDER BY rev ASC ';
			$sql .= ' LIMIT 1';
			$sth = $this->db->prepare($sql);
			$sth->execute(array(
				$this->session,
				$this->user
			));
			$data = $sth->fetch(PDO::FETCH_ASSOC);
			return ($data);
		}
		else {
			return (FALSE);
		}
	}
	/**
	 * 名前を付けてBOKデータを保存する
	 * @param	$datat	(array)
	 */
	public function saveBokData($data) {
		//ユーザIDを追加
		$data += array('user_id' => $this->user);
		//ソート
		ksort($data);
		//項目名・データを抽出
		$k = array_keys($data);
		$param = array_values($data);
		$v = array_fill(0,count($param),'?');

		$name = wfGetDB(DB_SLAVE)->tableName('wbs_saveboktree');
		$sql  = 'INSERT INTO '.$name.' (';
		$sql .= '`'.implode('`,`',$k).'`';
		$sql .= ') VALUES ('.implode(',',$v).')';
		$sth = $this->db->prepare($sql);
		return ($sth->execute($param));
	}
	/**
	 * 保存済みBOKデータを取得
	 * @param $name	保存名称
	 */
	public function loadBokData($a,$b) {
		$name = wfGetDB(DB_SLAVE)->tableName('wbs_saveboktree');
		$sql  = 'SELECT * FROM '.$name.' ';
		$sql .= ' WHERE user_id = ?';
		$sql .= '   AND title = ?';
		$sql .= ' LIMIT 1';
		$sth = $this->db->prepare($sql);
		//ユーザIDを取得
		$user = User::idFromName($a);
		$title = $b;
		if($sth->execute(array($user,$title)) === FALSE) {
			return (FALSE);
		}
		else {
			$data = $sth->fetch(PDO::FETCH_ASSOC);
			return ($data);
		}
	}
	/**
	 * 編集用のBOK(XML形式)を取得する
	 * @param	$rev	リビジョン番号(省略時:最新REV)
	 */
	public function getEditData($rev="") {
		//編集中のデータがあるか確認
		if($this->getUserEdit()) {
			//指定リビジョン番号があれば、そのリビジョンデータを取得
			if(empty($rev)) {
				$data = $this->getUserHead();
				if($data === FALSE) {
					$data = $this->getBokHead();
				}
			}
			else {
				$data = $this->getUserRev($rev);
				if($data === FALSE) {
					$data = $this->getBokRev($rev);
				}
			}
		}
		else {
			//指定リビジョン番号があれば、そのリビジョンデータを取得
			if(empty($rev)) {
				$data = $this->getBokHead();
			}
			else {
				$data = $this->getBokRev($rev);
			}
		}
		return ($data);
	}
	/**
	 * メインテーブルにデータを格納する
	 * @param	$rev	リビジョン番号
	 * @param	$bok	変更後BOK(XML形式)
	 * @param	$eSet	編集ノード情報
	 */
	public function setBokData($rev,$bok,$eSet) {
		//編集ノード情報を種別(追加/削除)ごとに分割
		$ids = array();
		foreach($eSet as $key => $set) {
			$tmp = array();
			foreach($set as $node => $path) {
				//ノード名称+パス情報
				$tmp[] = $node.BOK_COLUMN_SEP_PATH.$path;
			}
			//複数ノードの場合、区切り文字を利用して結合
			$ids[$key] = implode(BOK_COLUMN_SEP_IDS,$tmp); 
		}
		$data = array(
			'rev' => $rev,
			'bok' => $bok,
			//種別ごとに別カラムへ格納する(その種別が存在しない=>空文字とする)
			'new_ids' => (array_key_exists('add',$ids)) ? $ids['add'] : '',
			'del_ids' => (array_key_exists('del',$ids)) ? $ids['del'] : ''
		);
		//DBへ登録
		return $this->insertMain($data);
	}
	/**
	 * ユーザ用テーブルから指定リビジョン番号より後のデータを削除する
	 *   - UNDO/REDO時対策用に登録以降の編集データを削除
	 * @param $rev	リビジョン番号
	 */
	public function clearEditData($rev = 0) {
		$name = wfGetDB(DB_SLAVE)->tableName('wbs_userboktree');
		$del  = 'DELETE FROM '.$name.' ';
		$del .= ' WHERE `session_id` = ? ';
		$del .= '   AND `user_id` = ?';
		if($rev == 0) {
			$param = array($this->session,$this->user);
		}
		else {
			$del .= '   AND `rev` > ?';
			$param = array($this->session,$this->user,$rev);
		}
		$sth = $this->db->prepare($del);
		$sth->execute($param);
		return;
	}
	/**
	 * マージ結果をDBへ仮登録
	 *   - 仮登録エリアとしてユーザテーブルのリビジョン番号0を使用
	 * @param	$work	登録するBOK-XML
	 */
	public function setMergeTemporary($work) {
		$param = array($this->session,$this->user,0);
		//既存のテンポラリデータを削除
		$name = wfGetDB(DB_SLAVE)->tableName('wbs_userboktree');
		$del  = 'DELETE FROM '.$name.' ';
		$del .= ' WHERE `session_id` = ? ';
		$del .= '   AND `user_id` = ?';
		$del .= '   AND `rev` = ?';
		$sth = $this->db->prepare($del);
		$sth->execute($param);
		//データ登録
		$sql  = 'INSERT INTO '.$name.' ';
		$sql .= ' (`session_id`,`user_id`,`rev`,`bok`) ';
		$sql .= 'VALUES ';
		$sql .= ' ( ? , ? , ? , ? )';
		$sth = $this->db->prepare($sql);
		array_push($param,$work);
		$sth->execute($param);
		return;
	}
	/**
	 * 仮登録されているマージ結果をDBから取得
	 *   - 仮登録エリアとしてユーザテーブルのリビジョン番号0を使用
	 */
	public function getMergeTemporary() {
		$data = $this->getUserRev(0);
		$param = array($this->session,$this->user,0);
		$name = wfGetDB(DB_SLAVE)->tableName('wbs_userboktree');
		//既存のテンポラリデータを削除
		$del  = 'DELETE FROM '.$name.' ';
		$del .= ' WHERE `session_id` = ? ';
		$del .= '   AND `user_id` = ?';
		$del .= '   AND `rev` = ?';
		$sth = $this->db->prepare($del);
		$sth->execute($param);
		return $data['bok'];
	}

	/**
	 * ユーザー編集テーブルにデータを格納する
	 * @param	$rev	変更元リビジョン番号
	 * @param	$work	変更後BOK(XML形式)
	 */
	public function setEditData($rev,$work) {
		$name = wfGetDB(DB_SLAVE)->tableName('wbs_userboktree');
		if(($head = $this->getUserHead()) === FALSE){
			//編集開始データの作成(表示中のベースREVをもとにする...)
			$head = $this->getBokRev($rev);
			$sql  = 'INSERT INTO '.$name.' ';
			$sql .= ' (`session_id`,`rev`,`bok`,`user_id`) ';
			$sql .= 'VALUES ';
			$sql .= ' ( ? , ? , ? , ? )';
			$sth = $this->db->prepare($sql);
			$param = array(
						$this->session,
						$head['rev'],
						$head['bok'],
						$this->user
					);
			$sth->execute($param);
		}
		$_rev = intval($head['rev']);
		//不要な編集データをクリア(UNDO状態からの編集など)
		$this->clearEditData($rev);
		//2012/09/26追加
		$this->clearRepresentData($rev);
		if(!empty($rev)) {
			$rev = intval($rev) + 1;
			//データ登録
			$sql  = 'INSERT INTO '.$name.' ';
			$sql .= ' (`session_id`,`rev`,`bok`,`user_id`) ';
			$sql .= 'VALUES ';
			$sql .= ' ( ? , ? , ? , ? )';
			$sth = $this->db->prepare($sql);
			$param = array(
						$this->session,
						$rev,
						$work,
						$this->user
					);
			$sth->execute($param);
		}
		$result = $rev;
		return $result;
	}
	/**
	 * 編集競合解消条件リビジョンをもとにバックアップ済みかどうかを判定する
	 *  - バックアップが存在しない場合には、作成する
	 */
	public function setMergeBackup() {
		$data = $this->getMerger();
		//対象データがない場合には、現在使用中のファイルをもとにバックアップを作成
		if($data === FALSE) {
			require_once(BOK_MERGER_XMLCLASS);
			require_once(BOK_MERGER_MERGERCLASS);
			//バックアップファイル作成クラスのインスタンス化
			$backup = new MergerBackup();
			//バックアップ日時の取得
			$time = time();
			//バックアップファイル作成(フォルダ込み)
			$xml_file = $backup->make_backup(BOK_MERGER_XMLCLASS,$time);
			$merge_file = $backup->make_backup(BOK_MERGER_MERGERCLASS,$time);
		}
		else {
			if($data['merge_rev'] == BOKMERGE_REV) {
				return TRUE;
			}
		}
		return FALSE;
	}
	/**
	 * 編集競合条件の一覧を取得
	 *  - (前提)RULE_TITLE にその編集競合条件の名称を設定する
	 */
	public function getMergeConfigRevList() {
		$name = wfGetDB(DB_SLAVE)->tableName('wbs_mergerclass');
		$sql  = "SELECT merge_rev rev,max(value) name,max(time) last";
		$sql .= "  FROM ".$name." ";
		$sql .= " WHERE item_name = 'RULE_TITLE'";
		$sql .= " GROUP BY merge_rev";
		$sth = $this->db->prepare($sql);
		$sth->execute();
		$result = $sth->fetchAll(PDO::FETCH_ASSOC);
		if(count($result) > 0) {
			return $result;
		}
		else {
			/**
			 * デフォルト値を挿入して、そのデータを返すべき?
			 */
			return FALSE;
		}
	}
	/**
	 * 指定したリビジョン番号の編集競合解消条件を取得
	 *  - ただし、ここでは設定項目の内容を取得しない
	 *    (条件A にどんな内容があるかは不問で、条件A = Bのみ取得可能)
	 * @param	$rev	編集競合条件リビジョン番号
	 */
	public function getMergeConfigDataList($rev,$search=FALSE) {
		$param = array();
		array_push($param,$rev);
		$name = wfGetDB(DB_SLAVE)->tableName('wbs_mergerclass');
		$sql  = "";
		$sql .= "SELECT item_name,value_name,value ";
		$sql .= "  FROM ".$name." ";
		$sql .= " WHERE merge_rev = ? ";
		//マージルールタイトルと項目内容の名称設定データを除く
		$sql .= "   AND item_name != 'RULE_TITLE' ";
		if($search !== FALSE) {
			$sql .= "   AND search_flg = ? ";
			array_push($param,$search);
		}
		$sql .= "   AND value_name = '' ";
		$sql .= " ORDER BY sort_order,item_name , value ";
		$sth = $this->db->prepare($sql);
		$sth->execute($param);
		$result = $sth->fetchAll(PDO::FETCH_ASSOC);
		if(count($result) > 0) {
			return $result;
		}
		else {
			return FALSE;
		}
	}
	/**
	 * 条件番号-項目名を指定して、設定可能な選択肢を取得
	 * @param	$rev	編集競合条件リビジョン番号
	 * @param	$name	設定項目名称
	 */
	public function getMergeConfigValueList($rev,$name) {
		$tname = wfGetDB(DB_SLAVE)->tableName('wbs_mergerclass');
		$sql  = "";
		$sql .= "SELECT item_name,value_name,value ";
		$sql .= "  FROM ".$tname." ";
		$sql .= " WHERE merge_rev = ? ";
		$sql .= "   AND item_name = ? ";
		$sql .= "   AND value_name != '' ";
		$sql .= " ORDER BY sort_order, value,value_name ";
		$sth = $this->db->prepare($sql);
		$sth->execute(array($rev,$name));
		$result = $sth->fetchAll(PDO::FETCH_ASSOC);
		if(count($result) > 0) {
			return $result;
		}
		else {
			return FALSE;
		}
	}
	/**
	 * マージルールを取得
	 * @param	$rev	マージルールリビジョン番号
	 */
	public function getMergeSetting($rev) {
		$name = wfGetDB(DB_SLAVE)->tableName('wbs_mergerclass');
		//設定値の読み込み
		$sql  = "";
		$sql .= "SELECT a.item_name name,b.value ";
		$sql .= "  FROM ".$name." a ";
		$sql .= "  LEFT JOIN ".$name." b ON (";
		$sql .= "      a.merge_rev = b.merge_rev ";
		$sql .= "  AND a.item_name = b.item_name ";
		$sql .= "  AND a.value = b.value_name ";
		$sql .= " ) ";
		$sql .= " WHERE a.merge_rev = ? ";
		//マージルールタイトルと項目内容の名称設定データを除く
		$sql .= "   AND a.item_name != 'RULE_TITLE' ";
		$sql .= "   AND a.value_name = '' ";
		$sql .= " ORDER BY name , value ";
		$sth = $this->db->prepare($sql);
		$sth->execute(array($rev));
		$items = $sth->fetchAll(PDO::FETCH_NUM);
		//判定値の読み込み
		$sql  = "";
		$sql .= "SELECT concat(item_name,'_',value_name) name,value ";
		$sql .= "  FROM ".$name." ";
		$sql .= " WHERE merge_rev = ? ";
		//マージルールタイトルと項目内容の名称設定データを除く
		$sql .= "   AND item_name != 'RULE_TITLE' ";
		$sql .= "   AND value_name != '' ";
		$sql .= " ORDER BY name , value ";
		$sth = $this->db->prepare($sql);
		$sth->execute(array($rev));
		$datas = $sth->fetchAll(PDO::FETCH_NUM);
		//項目名(設定値)、判定値を合わせて戻り値とする
		$result = array_merge($items,$datas);
		if(count($result) > 0) {
			return $result;
		}
		else {
			return FALSE;
		}
	}
	/**
	 * マージルールを設定
	 */
	public function setMergeSetting($rev,$data) {
	}
	/**
	 * 編集競合データ登録
	 */
	public function setEditConflict($data) {
		//データにユーザーIDを追加
		$data += array('user_id' => $this->user);
		//ソート
		ksort($data);
		$k = array_keys($data);
		$param = array_values($data);
		$v = array_fill(0,count($param),'?');

		$name = wfGetDB(DB_SLAVE)->tableName('wbs_conflictlog');
		$sql  = 'INSERT INTO '.$name.' (';
		$sql .= '`'.implode('`,`',$k).'`';
		$sql .= ') VALUES ('.implode(',',$v).')';
		$sth = $this->db->prepare($sql);
		return ($sth->execute($param));
	}
	/**
	 * 競合クラス保存テーブルへのデータ追加処理
	 * デフォルトデータを登録していないと競合種別がすべてNoEdit扱いになってしまう
	 */
	public function setMerger($data) {
		//ソート
		ksort($data);
		$k = array_keys($data);
		$param = array_values($data);
		$v = array_fill(0,count($param),'?');
		$name = wfGetDB(DB_SLAVE)->tableName('wbs_mergerclass');
		$sql  = 'INSERT INTO '.$name.' (';
		$sql .= '`'.implode('`,`',$k).'`';
		$sql .= ') VALUES ('.implode(',',$v).')';
		$sth = $this->db->prepare($sql);
		return ($sth->execute($param));
	}
	/**
	 * 編集競合データ取得
	 */
	public function getEditConflictList() {
		$result = array();
		$name = wfGetDB(DB_SLAVE)->tableName('wbs_conflictlog');
		$sql  = 'SELECT log.id, log.type, log.user_id, log.time';
		$sql .= '  FROM '.$name.' log ';
		$sth = $this->db->prepare($sql);
		$sth->execute();
		$result = $sth->fetchAll(PDO::FETCH_ASSOC);
		return $result;
	}
	public function getEditConflict($num) {
		$name = wfGetDB(DB_SLAVE)->tableName('wbs_conflictlog');
		$sql  = 'SELECT * FROM '.$name.' ';
		$sql .= ' WHERE id = ?';
		$sth = $this->db->prepare($sql);
		$sth->execute(array($num));
		$data = $sth->fetch(PDO::FETCH_ASSOC);
		return $data;
	}
	/**
	 * 編集競合データ検索
	 */
	public function searchEditConflict($type) {
	}
	
	/**
	 * 代表表現データの登録
	 */
	public function setRepresentData($data) {
		//ユーザIDを追加
		$data += array('session_id'=>$this->session);
		$data += array('user_id' => $this->user);
		//ソート
		ksort($data);
		//項目名・データを抽出
		$k = array_keys($data);
		$param = array_values($data);
		$v = array_fill(0,count($param),'?');

		$name = wfGetDB(DB_SLAVE)->tableName('wbs_wkrepresent');
		$sql  = 'INSERT INTO '.$name.' (';
		$sql .= '`'.implode('`,`',$k).'`';
		$sql .= ') VALUES ('.implode(',',$v).')';
		$sth = $this->db->prepare($sql);
		return($sth->execute($param) === FALSE);
	}
	/**
	 * 編集中代表表現データの取得
	 */
	public function getWkRepresent($rev) {
		$name = wfGetDB(DB_SLAVE)->tableName('wbs_wkrepresent');
		$sql = 'SELECT `source`,`target` FROM '.$name.' WHERE `session_id` = ? AND `user_id` = ? ';
		if(empty($rev)) {
			$param = array($this->session,$this->user);
		}
		else {
			$sql .= ' AND `rev` <= ? ';
			$param = array($this->session,$this->user,$rev);
		}
		$sql .= ' ORDER BY `rev`,`source`,`target`';
		$sth = $this->db->prepare($sql);
		$sth->execute($param);
		$result = $sth->fetchAll(PDO::FETCH_ASSOC);
		return $result;
	}
	/**
	 * 代表表現データの削除
	 */
	public function clearRepresentData($rev="") {
		$param = array($this->session,$this->user);
		$name = wfGetDB(DB_SLAVE)->tableName('wbs_wkrepresent');
		//既存のテンポラリデータを削除
		$del  = 'DELETE FROM '.$name.' ';
		$del .= ' WHERE `session_id` = ? ';
		$del .= '   AND `user_id` = ?';
		//UNDO/REDO対策(設定リビジョン番号以降のデータを削除)
		if(!empty($rev)) {
			array_push($param,$rev);
			$del .= ' AND `rev` > ? ';
		}
		$sth = $this->db->prepare($del);
		$sth->execute($param);
		return true;
	}
	/**
	 * データ登録
	 */
	public function setDisplaylog($type,$data) {
		//IDは自動採番なので除外
		$chk = array('id'=>true);
		//登録方法によって除外項目を変更
		if($type == 0) {
			$chk['user_id']=true;
			$chk['title']=true;
		}
		else {
			$chk['rev']=true;
		}
		//データ項目名・設定値を再設定
		$inData = array();
		foreach($data as $k => $v) {
			if(!array_key_exists($k,$chk)) {
				//USER_IDは別途取得
				if(strtolower($k) == 'user_id') {
					$inData[$k] = User::idFromName($v);
				}
				else if((strtolower($k) == 'allreps') || (strtolower($k) == 'description_pages')) {
					$inData[$k] = serialize($v);
				}
				else {
					$inData[$k] = $v;
				}
			}
		}
		//ソート
		ksort($inData);
		$key = array_keys($inData);
		$param = array_values($inData);
		$val = array_fill(0,count($param),'?');
		//クエリ生成
		$tableName = wfGetDB(DB_SLAVE)->tableName('wbs_displog');
		$sql  = 'INSERT INTO '.$tableName.' (`'.implode('`,`',$key).'`) VALUES ('.implode(',',$val).')';
		$sth = $this->db->prepare($sql);
		return ($sth->execute($param));
	}
	/**
	 * データ取得
	 */
	public function getDisplaylog($param) {
		$tableName = wfGetDB(DB_SLAVE)->tableName('wbs_displog');
		$sql = 'SELECT `allreps`,`description_pages` FROM '.$tableName.' WHERE ';
		$_key = array();
		$_val = array();
		foreach($param as $key => $val) {
			$_key[] = "`{$key}` = ?";
		}
		$sql .= implode(' AND ',$_key);
		$sql .= ' LIMIT 1';
		$sth = $this->db->prepare($sql);
		$sth->execute(array_values($param));
		$data = $sth->fetch(PDO::FETCH_ASSOC);
		$res = false;
		if($data !== FALSE) { 
			$res['allreps'] = unserialize($data['allreps']);
			$res['description_pages'] = unserialize($data['description_pages']);
		}
		return $res;
	}
	/**
	 * BokXMLデータのコミット履歴を表示
	 * @param $from		更新日時(開始)
	 * @param $to		更新日時(終了)
	 * @param $user		ユーザ名称
	 * @param $title	登録名称
	 */
	public function getSaveList($from="",$to="",$user="",$title=""){
		$tableName = wfGetDB(DB_SLAVE)->tableName('wbs_saveboktree');
		$sql = 'SELECT user_id,title,comment,time FROM '.$tableName.' ';
		$_key = array();
		$_val = array();
		if(!empty($from)) {
			$_key[] = "`time` >= ?";
			$_val[] = $from;
		}
		if(!empty($to)) {
			$_key[] = "`time` <= ?";
			$_val[] = $to;
		}
		if(!empty($user) && !is_null($user)) {
			$_key[] = "`user_id` = ?";
			$_val[] = User::idFromName($user);
		}
		if(!empty($title) && !is_null($title)) {
			$_key[] = "`title` Like '%{$title}%'";
		}
		if(count($_key) > 0) {
			$sql .= ' WHERE '.implode(' AND ',$_key);
		}
		$sth = $this->db->prepare($sql);
		$sth->execute($_val);
		$data = $sth->fetchAll(PDO::FETCH_ASSOC);
		return $data;
	}
	/**
	 * BokXMLデータのコミット履歴を表示
	 * @param $from	更新日時(開始)
	 * @param $to	更新日時(終了)
	 * @param $user	ユーザ名称
	 */
	public function getHistoryList($from="",$to="",$user=""){
		$tableName = wfGetDB(DB_SLAVE)->tableName('wbs_boktree');
		$sql = 'SELECT rev,user_id,time FROM '.$tableName.' ';
		$_key = array();
		$_val = array();
		if(!empty($from)) {
			$_key[] = "`time` >= ?";
			$_val[] = $from;
		}
		if(!empty($to)) {
			$_key[] = "`time` <= ?";
			$_val[] = $to;
		}
		if(!empty($user) && !is_null($user)) {
			$_key[] = "`user_id` = ?";
			$_val[] = User::idFromName($user);
		}
		if(count($_key) > 0) {
			$sql .= ' WHERE '.implode(' AND ',$_key);
		}
		$sth = $this->db->prepare($sql);
		$sth->execute($_val);
		$data = $sth->fetchAll(PDO::FETCH_ASSOC);
		return $data;
	}
	/**
	 * 拡張機能インストール時の共通更新処理(SQL実行)
	 *  - $> cd maintenance
	 *    $> php update.php
	 * @param $updater DatabaseUpdater
	 * @return bool
	 */
	public static function onLoadExtensionSchemaUpdates(DatabaseUpdater $updater = null) {
		$dir = dirname( __FILE__ );

		if ( $updater === null ) {
			// <= 1.16 support
			global $wgExtNewTables, $wgExtModifiedFields;
			$wgExtNewTables[] = array('wikibok-systems',"$dir/sql/create_revision_tables.sql");
			//$wgExtModifiedFields[] = array('table','field_name',dirname( __FILE__ ) . '/table.patch.field_name.sql');
		} else {
			// >= 1.17 support
			$updater->addExtensionUpdate( array( 'addTable', 'wikibok_system', "$dir/sql/create_revision_tables.sql", true ) );
			//$updater->addExtensionUpdate( array( 'addField', 'abuse_filter', 'af_global', "$dir/db_patches/patch-global_filters.sql", true ) );

/*
			//DBタイプによってSQL変更する場合,下記のように場合分け...
			if($updater->getDB()->getType() == 'mysql') {
			}
			else if($updater->getDB()->getType() == 'sqlite') {
			}
			else if($updater->getDB()->getType() == 'sqlite') {
			}
			else {
				throw new MWException("No known Schema updates.");
			}
*/
		}
		return true;
	}
/*******************************************************************************
 * 以下、プライベートメソッド
 *******************************************************************************/
	/**
	 * DB接続インスタンスの作成
	 */
	private function __init($dbhost, $dbname, $dbusername, $dbpassword) {
		try {
			//データベース指定して接続を作成
			$this->db = new \PDO(
				"mysql:host={$dbhost};dbname={$dbname}",
				$dbusername,
				$dbpassword,
				array(\PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES UTF8')
			);
		}
		catch(PDOException $e) {
			$message = $e->getMessage();
			var_dump($message);
		}
	}
	/**
	 * 対象ユーザーが編集中データを保持しているか確認
	 * @return	TRUE:編集中データあり/FALSE:編集中データなし
	 * @access	private
	 */
	private function getUserEdit() {
		$name = wfGetDB(DB_SLAVE)->tableName('wbs_userboktree');
		$sql  = 'SELECT COUNT(*) cnt FROM '.$name.' ';
		$sql .= ' WHERE session_id = ?';
		$sql .= '   AND user_id = ?';
		$sth = $this->db->prepare($sql);
		$sth->execute(array(
			$this->session,
			$this->user
		));
		$data = $sth->fetch(PDO::FETCH_ASSOC);
		if($data["cnt"] <= 0) {
			return (FALSE);
		}
		else {
			return (TRUE);
		}
	}
	/**
	 * メインテーブルへのデータ追加処理
	 * @param	$bok	BOK(XML形式)
	 * @param	$diff	差分配列
	 */
	private function insertMain($data) {
		//データにユーザーIDを追加
		$data += array('user_id' => $this->user);
		//ソート
		ksort($data);
		$k = array_keys($data);
		$param = array_values($data);
		$v = array_fill(0,count($param),'?');
		//クエリ生成
		$name = wfGetDB(DB_SLAVE)->tableName('wbs_boktree');
		$sql  = 'INSERT INTO '.$name.' (';
		$sql .= '`'.implode('`,`',$k).'`';
		$sql .= ') VALUES ('.implode(',',$v).')';
		$sth = $this->db->prepare($sql);
		return ($sth->execute($param));
	}
}
?>
