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

		//BOK-XML
		if($this->params['ldbokdata']) {
			$data = $this->getBokData();
			if(count($data)) {
				$result->addValue(null,$this->getModuleName(),array('bok'=>array('count'=>count($data))));
				$result->setIndexedTagName($data,'link');
				$result->addValue($this->getModuleName(),'bok',$data);
			}
		}
		//データ取得
		$data = $this->getSmwData();
		if(count($data)) {
			$result->addValue(null,$this->getModuleName(),array('smw'=>array('count'=>count($data))));
			$result->setIndexedTagName($data,'link');
			$result->addValue($this->getModuleName(),'smw',$data);
		}
		
		return true;
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
			$res = $xml->getListData();
		}
		return $res;
	}
	/**
	 * パラメータを元にWHERE句を作成...
	 */
	private function setWhere($item,$val,$quote=true) {
		$db = $this->getDB();
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
		$db = $this->getDB();

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
		$where = array_merge($where,$this->setWhere('s_id.smw_title',$this->params['ldsource']));
		$where = array_merge($where,$this->setWhere('o_id.smw_title',$this->params['ldtarget']));

		//名前空間はデフォルト値あり
		$ns = (empty($this->params['ldnamespace'])) ? array(NS_SPECIAL_DESCRIPTION) : $this->params['ldnamespace'];
		$where = array_merge($where,$this->setWhere('s_id.smw_namespace',$ns,false));
		$where = array_merge($where,$this->setWhere('o_id.smw_namespace',$ns,false));
		if(count($where)) {
			$query .= 'WHERE '.implode(' AND ',$where);
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
			}
		}
		$db->freeResult($_res);
		return $res;
	}
	/**
	 * RevisionDBへのアクセス用インスタンスを作成
	 */
	private function getRevDB() {
		if (!isset ($this->mRevisionDB)) {
			$this->profileDBIn();
			$this->mRevisionDB = new RevisionDB(
				BOK_DATABASE_HOST,
				BOK_DATABASE_DB,
				BOK_DATABASE_USER,
				BOK_DATABASE_PASS
			);
			$this->profileDBOut();
		}
		return $this->mRevisionDB;
	}
	/**
	 * WIKIDBへのアクセス用インスタンスを作成
	 */
	private function getDB() {
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
			'This module is used to get description link data.'
		);
	}
	/**
	 * APIモジュールのパラメータ設定範囲
	 */
	public function getAllowedParams() {
		return array(
			'ldlinkname' => array(ApiBase::PARAM_TYPE => 'string' ,ApiBase::PARAM_ISMULTI => true,ApiBase::PARAM_ALLOW_DUPLICATES => true),
			'ldsource'   => array(ApiBase::PARAM_TYPE => 'string' ,ApiBase::PARAM_ISMULTI => true,ApiBase::PARAM_ALLOW_DUPLICATES => true),
			'ldtarget'   => array(ApiBase::PARAM_TYPE => 'string' ,ApiBase::PARAM_ISMULTI => true,ApiBase::PARAM_ALLOW_DUPLICATES => true),
			'ldnamespace'=> array(ApiBase::PARAM_TYPE => 'integer',ApiBase::PARAM_ISMULTI => true,ApiBase::PARAM_ALLOW_DUPLICATES => true),
			'ldlimit'=>array(ApiBase::PARAM_TYPE => 'integer',ApiBase::PARAM_MIN => 1),
			'ldbokdata'=>false
		);
	}
	/**
	 * APIモジュールのパラメータ説明
	 */
	public function getParamDescription() {
		return array(
			'ldlinkname' => 'A list of linkname.',
			'ldsource' => 'A list of titles to linked from.',
			'ldtarget' => 'A list of titles to linked to.',
			'ldnamespace'=>array('Show links in this namespace(s) only.','Default:'.NS_SPECIAL_DESCRIPTION),
			'ldlimit'=>array('How many links to return.'),
			'ldbokdata'=>"Get link from WikiBOK-XML's Data."
		);
	}
	/**
	 * APIモジュールの使用サンプルURLなど(URIは自動リンク)
	 */
	public function getExamples() {
		return array(
			'Get links pages',
			'  api.php?action=wikibok'
		);
	}


}
