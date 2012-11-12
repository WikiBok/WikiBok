<?
require_once("config/setting.php");
require_once("class/RevisionDB.class.php");
require_once("class/BokXml.class.php");

class LinkDataApi extends ApiBase {

	private $params;
	private $mSlaveDB = null;
	private $mRevisionDB = null;

	/**
	 * APIモジュール実行
	 */
	public function execute() {
		global $wgUser,$wgOut;
		//GET Param
		$this->params = $this->extractRequestParams();
		//戻り値の設定
		$result = $this->getResult();
		$data = array();
		$bokdata = array();

		//BOK-XML
		if(!$this->params['ldonlysmw']) {
			$bokdata = $this->getBokData();
			$bokdata = array_filter($bokdata,array(__CLASS__,'filterBok'));
		}
		//SMW-LINKS
		list($smwdata,$smwname) = $this->getSmwData();
		//MERGE
		$data = array_merge($bokdata,$smwdata);
		if(count($data) > 0) {
			//BOKリンクの件数
			$bok_count = array();
			if(($a = $this->filter_count($bokdata,'bok')) < 1) {
				//ノード指定した場合[リンクの方向を区別]
				$p = $this->filter_count($bokdata,'parent');
				$c = $this->filter_count($bokdata,'childs');
				$bok_count['all'] = $p + $c;
				$bok_count['parent'] = $p;
				$bok_count['childs'] = $c;
			}
			else { 
				$bok_count['all'] = $a;
			}
			//SMWリンクの件数
			$smwcount = array('all'=>0);
			//リンク名称ごとにも数える
			foreach($smwname as $v) {
				$c = $this->filter_count($smwdata,$v);
				$smwcount[$v] = $c;
				$smwcount['all'] += $c;
			}
			$result->addValue(null,$this->getModuleName(),array('count'=>array('bok'=>$bok_count,'smw'=>$smwcount)));
			$result->setIndexedTagName($data,'link');
			$result->addValue($this->getModuleName(),'links',$data);
		}
		
		return true;
	}
	/**
	 * BOK-XMLデータを取り除く
	 */
	private function filterBok($v) {
		return (isset($v['filter']) && ($v['filter']));
	}
	/**
	 * linknameを指定して件数を数える
	 * @param $a	リンクデータ
	 * @param $b	リンク名称
	 */
	private function filter_count($a,$b) {
		$tmp = array_fill(0,count($a),$b);
		$cnt = array_map(array(__CLASS__,'_map'),$a,$tmp);
		return count(array_filter($cnt));
	}
	/**
	 * 限定のための適用関数
	 */
	private function _map($a,$b) {
		return ($a['linkname'] == $b);
	}
	/**
	 * BOK-XMLデータをリンク形式で取得
	 */
	private function getBokData() {
		$res = array();
		$db = $this->getRevDB();
		$data = $db->getBokHead();
		if($data !== false) {
			$xml = new BokXml($data['bok']);
			$_res = $xml->getListData();
			foreach($_res as $rec) {
				$a_flg = array();
				$type = '';
				$f_s = false;
				$f_t = false;
				if($this->params['ldsource']) {
					$check = $this->params['ldsource'];
					$f_s = (array_search($rec['source'],$check) > -1);
					$f_t = (array_search($rec['target'],$check) > -1);
					$a_flg[] = ($f_s || $f_t);
				}
				if($this->params['ldtarget']) {
					$check = $this->params['ldtarget'];
					$f_s = (array_search($rec['source'],$check) > -1);
					$f_t = (array_search($rec['target'],$check) > -1);
					$a_flg[] = ($f_s || $f_t);
				}
				if($this->params['ldnode'] && !isset($rec['filter'])) {
					$check = $this->params['ldnode'];
					$f_s = (array_search($rec['source'],$check) > -1);
					$f_t = (array_search($rec['target'],$check) > -1);
					$a_flg[] = ($f_s || $f_t);
				}
				if(!$this->params['ldsource'] && !$this->params['ldtarget'] && !$this->params['ldnode']) {
					$rec['filter'] = true;
				}
				else {
					$rec['filter'] = (count(array_filter($a_flg)) > 0);
				}
				//BOKのリンク方向を設定...
				if($f_s) {
					$rec['linkname'] = 'childs';
				}
				elseif($f_t){
					$rec['linkname'] = 'parent';
				}
				$res[] = $rec;
			}
		}
		return $res;
	}
	/**
	 * パラメータを元にWHERE句を作成...
	 */
	private function setWhere($item,$val,$quote=true) {
		$db = $this->_getDB();
		$res = array();
		$data = $val;
		if(!empty($data)) {
			if(count($data) > 1){
				$value = array();
				foreach($data as $v) {
					$value[] = ($quote) ? $db->addQuotes($v) : $v;
				}
				$res[] = $item.' in ('.implode(',',$value).')';
			}
			else {
				$res[] = $item.' = '.(($quote)?$db->addQuotes($data[0]):$db->addQuotes($data[0]));
			}
		}
		return $res;
	}
	/**
	 * データベースからデータを取得
	 */
	private function getSmwData() {
		$res = array();
		$linktype = array();
		$db = $this->_getDB();

		$smw_ids = $db->tableName('smw_ids');
		$smw_rels2 = $db->tableName('smw_rels2');
		//SMWリンクデータを取得
		$query = 
		'SELECT s_id.smw_namespace s_ns,'.
		'       s_id.smw_title s,'.
		'       p_id.smw_title p,'.
		'       o_id.smw_namespace o_ns,'.
		'       o_id.smw_title o '.
		'  FROM '.$smw_ids.' s_id '.
		'  JOIN '.$smw_rels2.' s_rel ON s_id.smw_id = s_rel.s_id '.
		'  JOIN '.$smw_ids.' p_id ON s_rel.p_id = p_id.smw_id '.
		'  JOIN '.$smw_ids.' o_id ON s_rel.o_id = o_id.smw_id ';
		//パラメータを元にデータを限定
		$where = array();
		$where = array_merge($where, $this->setWhere('p_id.smw_title',$this->params['ldlinkname']));

		//名前空間はデフォルト値あり
		$ns = (empty($this->params['ldnamespace'])) ? array(NS_SPECIAL_DESCRIPTION) : $this->params['ldnamespace'];
		$where = array_merge($where,$this->setWhere('s_id.smw_namespace',$ns,false));
		$where = array_merge($where,$this->setWhere('o_id.smw_namespace',$ns,false));
		if(empty($this->params['ldnode'])) {
			$where = array_merge($where, $this->setWhere('s_id.smw_title',$this->params['ldsource']));
			$where = array_merge($where, $this->setWhere('o_id.smw_title',$this->params['ldtarget']));
		}
		else {
			$arrayOr = array();
			$arrayOr = array_merge($arrayOr, $this->setWhere('s_id.smw_title',$this->params['ldnode']));
			$arrayOr = array_merge($arrayOr, $this->setWhere('o_id.smw_title',$this->params['ldnode']));
			$where = array_merge($where,array('('.implode(' OR ',$arrayOr).')'));
		}
		if(count($where)) {
			$query .= ' WHERE '.implode(' AND ',$where);
		}


		if($this->params['ldlimit']) {
			$query .= ' LIMIT '.$this->params['ldlimit'];
		}
		$query .= ' ORDER BY p_id.smw_title,s_id.smw_namespace,s_id.smw_title, o_id.smw_namespace,o_id.smw_title';
		
		$_res = $db->query($query);
		if($db->numRows($_res) > 0) {
			while($row = $db->fetchObject($_res)) {
				$res[] = array(
					'source' => "{$row->s}",
					'source_ns' => "{$row->s_ns}",
					'target' => "{$row->o}",
					'target_ns' => "{$row->o_ns}",
					'linkname' => "{$row->p}"
				);
				if(!array_key_exists($row->p,$linktype)) {
					$linktype[$row->p] = true;
				}
			}
		}
		$db->freeResult($_res);
		return array($res,array_keys($linktype));
	}
	/**
	 * RevisionDBへのアクセス用インスタンスを作成
	 */
	private function getRevDB() {
		if (!isset ($this->mRevisionDB)) {
			$this->profileDBIn();
			$this->mRevisionDB = new RevisionDB();
			$this->profileDBOut();
		}
		return $this->mRevisionDB;
	}
	/**
	 * WIKIDBへのアクセス用インスタンスを作成
	 *  - API_BASE に同名関数があるので変更...
	 */
	private function _getDB() {
		if (!isset ($this->mSlaveDB)) {
			$this->profileDBIn();
			$this->mSlaveDB = wfGetDB(DB_SLAVE,'api');
			$this->profileDBOut();
		}
		return $this->mSlaveDB;
	}
	/**
	 * APIモジュールのバージョン情報取得
	 */
	public function getVersion() {
		return __CLASS__.' : $Id$';
	}
	/**
	 * APIモジュールの説明
	 */
	public function getDescription() {
		return array(
			'This module is used to get description link data.',
			'This module treat a bok-link as two links.(parent->child ans child->parent)'
		);
	}
	/**
	 * APIモジュールのパラメータ設定範囲
	 */
	public function getAllowedParams() {
		return array(
			'ldnode'     => array(ApiBase::PARAM_TYPE => 'string' ,ApiBase::PARAM_ISMULTI => true,ApiBase::PARAM_ALLOW_DUPLICATES => true),
			'ldsource'   => array(ApiBase::PARAM_TYPE => 'string' ,ApiBase::PARAM_ISMULTI => true,ApiBase::PARAM_ALLOW_DUPLICATES => true),
			'ldtarget'   => array(ApiBase::PARAM_TYPE => 'string' ,ApiBase::PARAM_ISMULTI => true,ApiBase::PARAM_ALLOW_DUPLICATES => true),
			'ldnamespace'=> array(ApiBase::PARAM_TYPE => 'integer',ApiBase::PARAM_ISMULTI => true,ApiBase::PARAM_ALLOW_DUPLICATES => true),
			'ldlimit'    => array(ApiBase::PARAM_TYPE => 'integer',ApiBase::PARAM_MIN => 1),
			'ldlinkname' => array(ApiBase::PARAM_TYPE => 'string' ,ApiBase::PARAM_ISMULTI => true,ApiBase::PARAM_ALLOW_DUPLICATES => true),
			'ldonlysmw'  => false,
		);
	}
	/**
	 * APIモジュールのパラメータ説明
	 */
	public function getParamDescription() {
		return array(
			'ldlinkname' => 'A list of linkname.',
			'ldsource' => 'A list of titles to smw-link-from.',
			'ldtarget' => 'A list of titles to smw-link-to.',
			'ldnode' => 'A list of titles to smw-link-form/smw-link-to.',
			'ldnamespace'=>array('Show links in this namespace(s) only.','Default:'.NS_SPECIAL_DESCRIPTION),
			'ldlimit'=>array('How many links to return.'),
			'ldonlysmw'=>'result is only smw-links.[no bok-links]'
		);
	}
	/**
	 * APIモジュールの使用サンプルURLなど(URIは自動リンク)
	 */
	public function getExamples() {
		return array(
			'Get all links',
			'  api.php?action=wikibok',
			"Get target page's links", //'
			'  api.php?action=wikibok&ldnode=Main%20Page',
			"Get target page's smw-links", //'
			'  api.php?action=wikibok&ldonlysmw&ldnode=Main%20Page',
			"Get target page's link data", //'
			'  api.php?action=wikibok&ldsource=Main%20Page',
		);
	}


}
