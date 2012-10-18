<?php
class BokXmlMerger {
	private $merge_rev,$config,
			$base,$head,$work,
			$hEditSet,$wEditSet,
			$hMbt,$wMbt,
			$conflict_type;
	public function __construct() {
		//設定の初期化
		self::loadConfig();
	}
	/**
	 * 3つのBOK-XMLをもとに編集要素を算出する
	 */
	private function _run($base,$head,$work) {
		$this->base = new BokXml($base);
		$this->head = new BokXml($head);
		$this->work = new BokXml($work);
		//EditSet/MBT算出
		list($this->hEditSet,$this->hMbt) = $this->getChangeNode($this->base,$this->head);
		list($this->wEditSet,$this->wMbt) = $this->getChangeNode($this->base,$this->work);
	}
	/**
	 * 林状態のBOK-XMLに対して、個別のBOK木としてEditSet,MBTを算出する
	 * @param	(BokXml)$_base		変更前BOKインスタンス
	 * @param	(BokXml)$_branch	変更後BOKインスタンス
	 */
	private function getChangeNode($_base,$_branch) {
		//BOK木ごとに分割
		$base = $_base->splitBokTree();
		$bran = $_branch->splitBokTree();
		//空BOKインスタンスを作成
		$empty = new BokXml();
		//EditSet戻り値の初期化
		$add = $del = array();
		//BOK木のループ用名称取得
		$keys = array_keys($base + $bran);
		if(count($keys) > 0) {
			//分割したBOK木ごとに処理
			foreach($keys as $top) {
				//存在しないBOK木の場合、空BOKを比較対象として設定
				$base_xml = (array_key_exists($top,$base)) ? $base[$top] : $empty;
				$bran_xml = (array_key_exists($top,$bran)) ? $bran[$top] : $empty;
				//MBT算出は原則BASEをもとにするが、BOK木そのものがない場合、Branchをもとにする
				$check = (array_key_exists($top,$base)) ? $base_xml : $bran_xml;
				//EditSet算出
				$eSet = $this->getEditTree($base_xml->getNodeTree(),$bran_xml->getNodeTree());
				//MBT算出
				$mbt[$top] = $check->getMbtNode($eSet);
				//EditSetはBOK木ごとに分割する必要はない
				$add = array_merge($add,$eSet['add']);
				$del = array_merge($del,$eSet['del']);
			}
		}
		else {
			$mbt = array(); 
		}
		//EditSet整形
		$editSet = array('add'=>$add,'del'=>$del);
		//list関数で受けることを考慮
		return array($editSet,$mbt,'EditSet'=>$editSet,'MBT'=>$mbt);
	}
	public function gethEditSet() {
		return $this->hEditSet;
	}
	public function getwEditSet() {
		return $this->wEditSet;
	}
	/**
	 * BOK-XMLの編集用配列をもとに編集要素(EditSet)を算出する
	 */
	private function getEditTree($base,$branch) {
		//差集合の取得
		list($b_a,$b_d) = $this->minus($base,$branch,'NUM');
		list($w_a,$w_d) = $this->minus($branch,$base,'NUM');
		return array('add' => $w_d + $b_a,'del' => $b_d);
	}
	public function getAddNode($_base,$_head) {
		$base = $_base->getNodeTree();
		$head = $_head->getNodeTree();
		//差集合の取得
		list($b_a,$b_d) = $this->minus($base,$head,'NUM');
		list($w_a,$w_d) = $this->minus($head,$base,'NUM');
		return array('add' => $w_d + $b_a,'del' => $b_d);
		//return $b_a;
	}
	/**
	 * BOK-XMLの編集用配列をもとに差集合を算出する
	 * @param	$base	基準とするBOK-XML(配列)
	 * @param	$branch	対象とするBOK-XML(配列)
	 * @param	$type	戻り値の形式
	 */
	private function minus($base,$branch,$type='') {
		$add = array();
		$del = array();
		//baseを基準としてループする
		foreach($base as $key => $value) {
			if(array_key_exists($key,$branch)) {
				//両方にノードが存在する場合
				$chk = $branch[$key];
				if($value != $chk) {
					//XML-PATHが異なる場合、[削除]&[追加]とする
					$add[$key] = $chk;
					$del[$key] = $value;
				}
			}
			else {
				//branchに存在しない場合,[削除]とする
				$del[$key] = $value;
			}
		}
		//戻り値を整形する(list対応用に連想配列でない戻り値も選択可能にしておく)
		switch($type) {
			case 'ASSOC':
				$res = array('add'=>$add,'del'=>$del);
				break;
			case 'NUM':
				$res = array($add,$del);
				break;
			case 'BOTH':
			default:
				$res = array($add,$del,'add'=>$add,'del'=>$del);
				break;
		}
		return $res;
	}
	/**
	 * RevisionDBからマージルールの設定を取得
	 *  - インスタンス生成時に有効な設定は読み込み済み
	 *    過去のマージリビジョンを呼び出すため、外部参照できるようにしておく
	 * @param	$rev	マージリビジョン
	 */
	public function loadConfig($rev=BOKMERGE_ACTIVE_REV) {
		//初期化
		$this->config = array();
		//DBから設定値を取得
		$db = new RevisionDB(BOK_DATABASE_HOST,
							 BOK_DATABASE_DB,
							 BOK_DATABASE_USER,
							 BOK_DATABASE_PASS);
		$rows = $db->getMergeSetting($rev);
		//インスタンス内で保持する
		if($rows !== FALSE) {
			foreach($rows as $row) {
				list($name,$value) = $row;
				$this->setConfig($name,$value);
			}
		}
		else {
			//DBにデータがない場合、初期値を設定する
			$merge_default = array(
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_ADD_DELETE_CHILD',
						'value_name' => '',
						'value' => 'ON',
						'search_flg' => 1,
						'sort_order' => 4
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_ADD_DELETE_CHILD',
						'value_name' => 'OFF',
						'value' => '0',
						'search_flg' => 0,
						'sort_order' => 0
				)
				,array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_ADD_DELETE_CHILD',
						'value_name' => 'ON',
						'value' => '1',
						'search_flg' => 0,
						'sort_order' => 0
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_CONFLICT',
						'value_name' => '',
						'value' => '',
						'search_flg' => 0,
						'sort_order' => 0
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_CONFLICT',
						'value_name' => 'HEAVY',
						'value' => 'HEAVY',
						'search_flg' => 0,
						'sort_order' => 1
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_CONFLICT',
						'value_name' => 'LIGHT',
						'value' => 'LIGHT',
						'search_flg' => 0,
						'sort_order' => 2
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_CONFLICT',
						'value_name' => 'NON',
						'value' => 'NO CONFLICT',
						'search_flg' => 0,
						'sort_order' => 3
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_DELETE_NODE_CHILD',
						'value_name' => '',
						'value' => 'OFF',
						'search_flg' => 1,
						'sort_order' => 3
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_DELETE_NODE_CHILD',
						'value_name' => 'OFF',
						'value' => '1',
						'search_flg' => 0,
						'sort_order' => 0
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_DELETE_NODE_CHILD',
						'value_name' => 'ON',
						'value' => '0',
						'search_flg' => 0,
						'sort_order' => 0
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_EDITAREA',
						'value_name' => '',
						'value' => 'EDITSPOT',
						'search_flg' => 1,
						'sort_order' => 0
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_EDITAREA',
						'value_name' => 'ALL',
						'value' => '1',
						'search_flg' => 0,
						'sort_order' => 2
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_EDITAREA',
						'value_name' => 'EDITSPOT',
						'value' => '2',
						'search_flg' => 0,
						'sort_order' => 3
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_EDITAREA',
						'value_name' => 'MBT',
						'value' => '3',
						'search_flg' => 0,
						'sort_order' => 4
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_EDITAREA',
						'value_name' => 'NONE',
						'value' => '0',
						'search_flg' => 0,
						'sort_order' => 1
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_INTENTION',
						'value_name' => '',
						'value' => 'STRONG',
						'search_flg' => 1,
						'sort_order' => 2
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_INTENTION',
						'value_name' => 'STRONG',
						'value' => '1',
						'search_flg' => 0,
						'sort_order' => 0
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_INTENTION',
						'value_name' => 'WEAK',
						'value' => '0',
						'search_flg' => 0,
						'sort_order' => 0
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_PRIORITY',
						'value_name' => '',
						'value' => 'HEAD',
						'search_flg' => 1,
						'sort_order' => 1
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_PRIORITY',
						'value_name' => 'HEAD',
						'value' => '1',
						'search_flg' => 0,
						'sort_order' => 0
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'BOKMERGE_PRIORITY',
						'value_name' => 'WORK',
						'value' => '0',
						'search_flg' => 0,
						'sort_order' => 0
				),
				array(
						'merge_rev' => 1,
						'item_name' => 'RULE_TITLE',
						'value_name' => '',
						'value' => 'BASE_RULE',
						'search_flg' => 0,
						'sort_order' => 0
				)
			);
			foreach($merge_default as $def) {
				$db->setMerger($def);
			}
		}
		self::setMergeRev($rev);
		self::setConflictType();
	}
	private function setConflictType() {
		//DBから設定値を取得
		$db = new RevisionDB(BOK_DATABASE_HOST,
							 BOK_DATABASE_DB,
							 BOK_DATABASE_USER,
							 BOK_DATABASE_PASS);
		$list = array();
		$rows = $db->getMergeConfigValueList($this->merge_rev,'BOKMERGE_CONFLICT');
		//インスタンス内で保持する
		if($rows !== FALSE) {
			foreach($rows as $row) {
				$list[] = "{$row['item_name']}_{$row['value_name']}";
			}
		}
		$this->conflict_type = $list;
		return;
	}
	/**
	 * 読み込んだマージルールのリビジョン番号を設定
	 *  - 外からの直接変更は不可(loadConfigメソッドを使用すること)
	 * @param	$rev	設定値
	 */
	private function setMergeRev($rev) {
		$this->merge_rev = $rev;
	}
	/**
	 * 使用しているマージルールのリビジョン番号を取得
	 */
	public function getMergeRev() {
		return $this->merge_rev;
	}
	/**
	 * インスタンス内の情報を設定する
	 * @param	$key	項目名称
	 * @param	$value	設定値
	 */
	public function setConfig($key,$value) {
		$this->config["{$key}"] = $value;
	}
	/**
	 * インスタンス内の情報を取得する
	 * @param	$key	項目名称
	 * @return	(String)設定値
	 */
	public function getConfig($key) {
		return (array_key_exists($key,$this->config)
					? $this->config[$key] : FALSE);
	}
	/**
	 * [設定確認用]設定を名称ソートして出力
	 */
	public function listConfig() {
		ksort($this->config);
		return $this->config;
	}
	/**
	 * BOK木ごとに分割されたMBTの衝突チェック
	 */
	private function check_mbt_hierarchy() {
		//MBT = FALSEの場合変更なしなので、チェック対象にしない
		$keys = array_keys(array_filter($this->hMbt) + array_filter($this->wMbt));
		if(count($keys) == 0) {
			//すべて編集なし
			$result = FALSE;
		}
		else {
			//編集ありの場合、競合解決は行う
			//$result = $this->getConfig('BOKMERGE_CONFLICT_LIGHT');
			//各BOK木ごとにMBTの衝突を確認する
			foreach($keys as $key) {
				$hMbt = (array_key_exists($key,$this->hMbt)) ? $this->hMbt[$key]:FALSE;
				$wMbt = (array_key_exists($key,$this->wMbt)) ? $this->wMbt[$key]:FALSE;
				if(($hMbt === FALSE) && ($wMbt === FALSE)) {
					//両方FALSE(使用されない...)
					$result[$key] = FALSE;
				}
				else if(($hMbt === FALSE) || ($wMbt === FALSE)) {
					//WORK/HEADのいづれかが、「編集なし」/競合なし」
					$result[$key] = $this->getConfig('BOKMERGE_CONFLICT_NON');
				}
				else {
					//ノード名称を取得
					$hMbtName = key($hMbt);
					$wMbtName = key($wMbt);
					if (($this->base->check_hierarchy($hMbtName,$wMbtName) === 0) ||
						($this->base->check_hierarchy($wMbtName,$hMbtName) === 0))  {
					//親子関係あり
						$result[$key] = $this->getConfig('BOKMERGE_CONFLICT_HEAVY');
					}
					else {
					//親子関係なし
						$result[$key] = $this->getConfig('BOKMERGE_CONFLICT_LIGHT');
					}
				}
			}
		}
		return $result;
	}
	/**
	 * 競合タイプ判定
	 * @param	$base	BASE-XML(XML文字列)
	 * @param	$head	HEAD-XML(XML文字列)
	 * @param	$work	WORK-XML(XML文字列)
	 */
	public function checkMerge($base,$head,$work) {
		//戻り値初期化
		//$result = FALSE;
		//マージ判定処理
		$this->_run($base,$head,$work);
		//競合タイプの取得
		//BOK木ごとに競合タイプを設定する(MBT算出後)
		$conflict_list = $this->check_mbt_hierarchy();
		$result = FALSE;
		//編集なしの場合FALSE
		if($conflict_list !== FALSE) {
			//MERGEリビジョンで使用している競合条件の一覧から[SORT_ORDER]の小さいものほど重要度が高いものとする
			foreach($this->conflict_type as $type) {
				$conflict_type = $this->getConfig($type);
				//複数ある競合タイプを検索
				if(array_search($conflict_type,$conflict_list) !== FALSE) {
					$result = (empty($conflict_type)) ? false:$conflict_type;
					break;
				}
				//見つからない場合には、次の競合タイプを確認する
			}
		}
		return $result;
	}
	/**
	 * マージを実施する
	 * @param	$type	編集競合種別(checkMergeの戻り値)
	 * @param	$link	代表表現リンク先として指定されている(後発追加不可)
	 */
	public function doMerge($type,$link="") {
		//編集用変数の初期化
		$before_add = $before_del = array();
		$after_add = $after_del = array();
		$exist_key = array();
		if($type === FALSE || $type == "") {
			//編集なし
			return false;
		}
		else {
			//優先編集設定
			switch($this->getConfig('BOKMERGE_PRIORITY')) {
				//後行編集者の編集意図を優先
				case $this->getConfig('BOKMERGE_PRIORITY_WORK'):
					$before = $this->wEditSet;
					$after  = $this->hEditSet;
					$mbt = $this->wMbt;
					break;
				//先行編集者の編集意図を優先(デフォルト)
				case $this->getConfig('BOKMERGE_PRIORITY_HEAD'):
				default:
					$before = $this->hEditSet;
					$after  = $this->wEditSet;
					$mbt = $this->wMbt;
					break;
			}
			//優先編集意図は無条件で反映
			foreach($before['add'] as $node => $path) {
				$before_add[$node] = $path;
			}
			foreach($before['del'] as $node => $path) {
				$before_del[$node] = $path;
			}
			//優先編集意図の適用/戻り値(2項目)は編集対象ノード名称[EditingSpot]が設定される
			list($xml,$noTouch) = self::editNode($this->base,$before_add,$before_del);
			//編集意図主張範囲
			$editArea = $this->getConfig('BOKMERGE_EDITAREA');
			$editArea = ($editArea === FALSE) ? '':$editArea;
			//後発編集意図を変更する
			switch($editArea) {
				//編集範囲を主張しない => 後発も無条件で反映
				case $this->getConfig('BOKMERGE_EDITAREA_NONE'):
					break;
				//BOK全体を主張する => 削除不可
				case $this->getConfig('BOKMERGE_EDITAREA_ALL'):
					foreach($after['add'] as $node => $path) {
						if (!array_key_exists($node,$before_add) ||
							!array_key_exists($node,$before_del) ||
							!array_key_exists($node,$after['del'])) {
							//代表表現先を排除
							if(defined('BOK_REPRESENT_EDIT') && BOK_REPRESENT_EDIT && (is_array($link) && array_key_exists($node,$link))) {
								$exist_key[] = $node;
							}
							else {
								$after_add[$node] = $path;
							}
						}
						//優先で追加/削除している、または自身の編集で変更編集の場合、追加不可
						else {
							$exist_key[] = $node;
						}
					}
					break;
				//MBT範囲内では削除不可
				case $this->getConfig('BOKMERGE_EDITAREA_MBT'):
					foreach($after['add'] as $node => $path) {
						if (!array_key_exists($node,$before_add) ||
							!array_key_exists($node,$before_del) ||
							!array_key_exists($node,$after['del'])) {
							//代表表現先を排除
							if(defined('BOK_REPRESENT_EDIT') && BOK_REPRESENT_EDIT && (is_array($link) && array_key_exists($node,$link))) {
								$exist_key[] = $node;
							}
							else {
								$after_add[$node] = $path;
							}
						}
						//優先で追加/削除している、または自身の編集で変更編集の場合、追加不可
						else {
							$exist_key[] = $node;
						}
					}
					$base_tree = $this->base->splitBokTree();
					foreach($mbt as $top => $m) {
						$mbtName = ($m !== FALSE) ? key($m) : FALSE;
						if(array_key_exists($top,$base_tree) && $mbtName !== FALSE) {
							$chk_tree = $base_tree[$top];
							foreach($after['del'] as $node => $path) {
								if($chk_tree->check_hierarchy($mbtName,$node) === 0) {
									$after_del[$node] = $path;
								}
								else {
									$exist_key[] = $node;
								}
							}
						}
					}
					break;
				//EDITINGSPOTのみ削除不可
				case $this->getConfig('BOKMERGE_EDITAREA_EDITSPOT'):
				default:
					foreach($after['add'] as $node => $path) {
						if (!array_key_exists($node,$before_add) &&
							!array_key_exists($node,$before_del)) {
							//代表表現先を排除
							if(defined('BOK_REPRESENT_EDIT') && BOK_REPRESENT_EDIT && (is_array($link) && array_key_exists($node,$link))) {
								$exist_key[] = $node;
							}
							else {
								$after_add[$node] = $path;
							}
						}
						else {
							$exist_key[] = $node;
						}
					}
					foreach($after['del'] as $node => $path) {
						if (!array_key_exists($node,$before_add) &&
							!array_key_exists($node,$noTouch) &&
						//[特別]先行編集のEditingSpotを削除対象から除外
							!array_key_exists($node,$before_del)) {
							$after_del[$node] = $path;
						}
						else {
							$exist_key[] = $node;
						}
					}
					break;
			}
			//除外対象がある場合のみ処理を行う
			if(count($exist_key) > 0) {
				//結果をtemp変数へ格納(ループ対象と結果格納が同一変数の場合ろくなことにならない...)
				$temp = array();
				//後発編集の追加位置は編集者の包括的親子関係を重視する
				foreach($after_add as $node => $path) {
					//追加位置を分割
					$myKey = explode(BOKXML_SEPARATE_CHAR,$path);
					//除外位置との差分を取得
					$myRes = array_diff($myKey,$exist_key);
					//追加位置を結合
					$temp[$node] = implode(BOKXML_SEPARATE_CHAR,$myRes);
				}
				$after_add = $temp;
			}
			list($out) = self::editNode($xml,$after_add,$after_del);
			//最新版-マージ結果を比較して変更点を算出
			$eSet = $this->getEditTree($this->head->getNodeTree(),$out->getNodeTree());
			return array($out->saveXML(),$eSet);
		}
	}
	/**
	 * マージルールを適用し、ノードの操作を行う
	 * @param	$xml	BokXmlクラスインスタンス
	 * @param	$iSet	追加ノード(位置変更時の変更後ノードを含む)
	 * @param	$dSet	削除ノード(位置変更時の変更前ノードを含む)
	 */
	private function editNode(BokXml $xml,$iSet,$dSet) {
		//戻り値の初期化
		$_xml = clone $xml;
		$editTarget = array();
		//根こそぎ削除ルール
		$ckAllDelete = $this->getConfig('BOKMERGE_DELETE_NODE_CHILD');
		//ノードの削除操作
		if(is_array($dSet)) {
			//ノード削除は削除対象のノード名称のみで行える
			switch($ckAllDelete) {
				//根こそぎ削除する
				case $this->getConfig('BOKMERGE_DELETE_NODE_CHILD_ON'):
					foreach($dSet as $node => $path) {
						$_xml->delNode($node);
					}
					break;
				//根こそぎ削除しない
				case $this->getConfig('BOKMERGE_DELETE_NODE_CHILD_OFF'):
					foreach($dSet as $node => $path) {
						$_xml->delNodeOnly($node);
					}
					break;
			}
		}
		//ノードの追加操作
		if(is_array($iSet)) {
			foreach($iSet as $node => $path) {
				$tNode = array($node => $path);
				//削除編集後に存在する追加対象(親)ノードを取得
				// - 追加対象パスを遡り、現在BOK-XMLに存在するノードを追加対象とする
				$pNode = $_xml->getNodeParent($tNode);
				//EditingSpotとして取得(削除処理の場合、編集順番の関係で後行編集時には対象
				//にならない(削除済)ため、戻り値に含める必要がない
				$editTarget["{$pNode}"] = true;
				if($ckAllDelete === $this->getConfig('BOKMERGE_DELETE_NODE_CHILD_ON')) {
					//優先編集で削除したもの以下には追加不可
					break;
				}
				else {
					//根こそぎ削除設定なしの場合は、優先編集削除ノードへの追加設定を考慮
					$check = $this->getConfig('BOKMERGE_ADD_DELETE_CHILD');
					switch ($check) {
						case $this->getConfig('BOKMERGE_ADD_DELETE_CHILD_ON'):
						//優先編集で削除したものではない場合、追加を許可
							$_xml->addNodeTo($node,$pNode);
							break;
						case $this->getConfig('BOKMERGE_ADD_DELETE_CHILD_OFF'):
						default:
						//何もしない
							break;
					}
				}
			}
		}
		return array($_xml,$editTarget);
	}
}
