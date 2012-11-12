<?php
class BokXml{
	private $dom,$xPath;
	/**
	 * コンストラクタ
	 * @param $xml	XML形式のデータ
	 */
	public function __construct($xml="") {
		$this->dom = new \DOMDocument();
		//空白は無視
		$this->dom->preserveWhiteSpace = false;
		if(!empty($xml)) {
		//初期入力がある場合、ロードする
			$this->dom->loadXML($xml);
			//スキーマチェック
			if(!$this->check_schema()) {
				//形式エラーの場合、空XMLに変更する
				$this->emptyBokXml();
			}
		}
		else {
		//初期入力がない場合、空BOK-XMLを作成
			$this->emptyBokXml();
		}
		return;
	}
	/**
	 * 空XMLを作成する
	 * @param $change TRUE:クラスのメンバと入れ替える/FALSE:入れ替えない
	 */
	private function emptyBokXml($change = TRUE) {
		//新規DOMDocumentを作成
		$dom = new \DOMDocument('1.0');
		//共通設定
		$dom->encoding = 'UTF-8';
		$dom->formatOutput = false;
		$dom->preserveWhiteSpace = false;
		//疑似TOPノードを作成
		$node = $dom->appendChild($dom->createElement('node'));
		$name = $node->appendChild($dom->createElement('name'));
		$node->appendChild($dom->createElement('nodes'));
		if($change) {
			//インスタンスで使用するDOMDocumentの変更
			$this->dom = $dom;
		}
		return $dom;
	}
	/**
	 * 対象ノード以下のXMLのみを取り出す
	 * @param	$t	対象ノード名称
	 */
	public function getUnderNode($t) {
		//空BOK-XMLを作成
		$newDom = $this->emptyBokXml(FALSE);
		//疑似TOPノードを付け替え先に指定
		$moveTo = $newDom->getElementsByTagName("nodes")->item(0);
		//対象ノードを確認
		$target = $this->searchNameNode($t);
		if($target === FALSE || is_null($target)) {
			//MBTノードが存在しない場合、FALSEを返却
			return false;
		}
		else {
			//コピー対象は名称タグではなくノードタグなので親ノードを取得する必要がある
			$copy = $target->parentNode;
			$moveTo->appendChild($newDom->importNode($copy,true));
		}
		return $newDom->saveXML();
	}

	/**
	 * XMLデータが設定スキーマに合致することを確認
	 */
	private function check_schema() {
		$ret = @$this->dom->schemaValidate(BOKXML_SCHEMAFILE);
		return($ret);
	}
	/**
	 * 自身のDOMオブジェクトをもとにXPathインスタンスを作成
	 */
	private function getXPath() {
		//インスタンス未作成の場合のみ、作成処理
		if($this->xPath == null) {
			$this->xPath = new \DOMXPath($this->dom);
		}
		return $this->xPath;
	}
	/**
	 * ノード名称の重複がないことを確認
	 * @return	(Bool) TRUE 重複なし/FALSE 重複あり
	 */
	public function checkDAG() {
		$xPath = $this->getXPath();
		//名称ノードの値だけ取り出す
		$query = '//name/text()';
		$nodes = $xPath->query($query);
		//重複データがあるかチェック
		$tmpdata = array();
		foreach($nodes as $node) {
			//名称を取り出し
			$key = $node->textContent;
			//配列キーにある場合、重複している
			if(array_key_exists($key,$tmpdata)) {
				return FALSE;
			}
			//存在しない場合、キーに設定(次回登場で重複)
			else {
				$tmpdata[$key] = 1;
			}
		}
		return TRUE;
	}
	/**
	 * 名称と一致するノードを返す
	 * @param	$t	指定名称
	 * @param	$s	TRUE:部分一致を許可/FALSE:不許可(デフォルト:不許可)
	 * @return	部分一致許可の場合	:DOMNodeList
	 *			部分一致不許可の場合:DOMNode
	 */
	private function searchNameNode($t,$s=FALSE) {
		$xPath = $this->getXPath();
		//ダブルクォーテションのエスケープ
		$esc_t = explode("'",$t); //'
		if(count($esc_t) > 1) {
			$t = "concat('".implode("',\"'\",'",$esc_t)."')"; //'
		}
		else {
			$t = "'{$t}'";
		}
		if(!$s) {
			//完全一致用XPath
			$query = '//name[text() = '.$t.']';
			$nodes = $xPath->query($query);
			if($nodes->length == 0) {
				//見つからない場合
				$node = false;
			}
			else {
				//利便性のためNodeListからNodeのみを取り出す
				$node = $nodes->item(0);
			}
		}
		else {
			//部分一致用XPath
			$query = '//name[contains(text(),'.$t.')]';
			$node = $xPath->query($query);
		}
		return $node;
	}
	/**
	 * ノード名称を変更
	 * @param $from	変更元ノード名称
	 * @param $to	変更後ノード名称
	 */
	public function renameNode($from,$to) {
		$res = false;
		$toNode = $this->searchNameNode($to);
		//リネーム先ノードが存在しないことを確認
		if($toNode === false) {
			//名称のみ変更
			$target = $this->searchNameNode($from)->parentNode;
			//NAME要素のみ削除
			$del = $target->getElementsByTagName('name')->item(0);
			$target->removeChild($del);
			//新しい名前でName要素を追加
			$target->appendChild($this->dom->createElement('name',$to));
			$res = true;
		}
		return $res;
	}
	/**
	 * 名称を指定してノードを削除する
	 *   - 対象ノード以下をすべて削除対象とする
	 * @param	$t	削除対象ノードの名称
	 */
	public function delNode($t) {
		$top = $this->dom->getElementsByTagName("nodes")->item(0);
		//指定名称のノードを探す
		$target = $this->searchNameNode($t);
		//対象が見つかった場合のみ処理する
		if(!is_null($target)) {
			//名称の親ノードが削除対象
			$delNode = $target->parentNode;
			//削除するために親ノードを取得
			$nodes = $delNode->parentNode;
			//削除実行
			$nodes->removeChild($delNode);
			//NODESタグが空になった場合、NODESタグも削除(TOP要素の場合を除く)
			if(!$top->isSameNode($nodes) && !$nodes->hasChildNodes()) {
				$parent = $nodes->parentNode;
				$parent->removeChild($nodes);
			}
		}
		//テーブルへ登録するためBOK(XML形式)を返却
		return $this->dom->saveXML();
	}
	/**
	 * 名称を指定してノードを削除する
	 *   - 対象ノード以下にあるノードは親ノードに付け替える
	 * @param	$t	削除対象ノードの名称
	 */
	public function delNodeOnly($t) {
		$target = $this->searchNameNode($t);
		//対象が見つかった場合のみ処理する
		if(!is_null($target)) {
			//削除対象ノード
			$delNode = $target->parentNode;
			//削除対象ノードの親ノードを探す
			$moveTo = $this->searchParentNode($delNode);
			//nodesタグの有無を判定
			if(($addTo = $moveTo->getElementsByTagName('nodes')->item(0)) == null) {
				//ない場合には作成する
				$addTo = $moveTo->appendChild($this->dom->createElement('nodes'));
			}
			//削除対象ノードの子ノードを探す
			$cNodes = $this->searchChildNode($delNode);
			if($cNodes !== FALSE) {
				//子ノードがある場合には、削除対象の親ノードに付け替える
				for($i=0 ; $i < $cNodes->length ; $i++) {
					$dChild  = $cNodes->item($i);
					$dParent = $dChild->parentNode;
					$dNode = $dParent->removeChild($dChild);
					$addTo->appendChild($dNode);
				}
			}
			$top = $this->dom->getElementsByTagName("nodes")->item(0);
			//削除するために親ノードを取得
			$nodes = $delNode->parentNode;
			//削除実行
			$nodes->removeChild($delNode);
			//NODESタグが空になった場合、NODESタグも削除(TOP要素の場合を除く)
			if(!$top->isSameNode($nodes) && !$nodes->hasChildNodes()) {
				$parent = $nodes->parentNode;
				$parent->removeChild($nodes);
			}
		}
		return $this->dom->saveXML();
	}
	/**
	 * 対象ノードの親ノード名称を取得(外部参照用)
	 * @param	$t	対象ノード名称
	 */
	public function getParentNodeName($t) {
		$target = $this->searchNameNode($t);
		$pNode = $this->searchParentNode($target->parentNode);
		return $this->getNodeName($pNode);
	}
	/**
	 * 対象ノードの親ノードを取得する
	 * @param	$t (DOMNode)
	 */
	private function searchParentNode($t) {
		//対象ノードのパスを取得
		$path = $t->getNodePath();
		//1階層上のノードを示すパスへ編集
		$query = preg_replace('/\/nodes\/node(\[[0-9]+\])*$/','',$path);
		//ツリー全体から対象のノードを検索
		$xPath = $this->getXPath();
		$nodes = $xPath->query($query);
		//ノードリストの1件目のみ返却(BOK制約)
		return ($nodes->length == 0) ? false : $nodes->item(0);
	}
	/**
	 * 対象ノードの子ノードを検索する
	 * @param	$t (DOMNode)
	 * @return	子ノードありの場合(DOMNodeList)／子ノードなしの場合(FALSE)
	 */
	private function searchChildNode($t) {
		//対象ノードのパスを取得
		$path = $t->getNodePath();
		//1階層下のノードを示すパスへ編集
		$query = $path.'/nodes/node';
		//ツリー全体から対象のノードを検索
		$xPath = $this->getXPath();
		$nodes = $xPath->query($query);
		if($nodes->length == 0) {
			$result = FALSE;
		}
		else {
			$result = $nodes;
		}
		return $result;
	}
	/**
	 * 子ノードの名称を指定して親ノードとの紐付を削除する
	 * @param	$t	子ノードの名称
	 */
	public function delEdge($t) {
		$top = $this->dom->getElementsByTagName("nodes")->item(0);
		//指定名称のノードを探す
		$target = $this->searchNameNode($t);
		//対象が見つかった場合のみ処理する
		if(!is_null($target)) {
			//名称の親ノードが削除対象
			$delNode = $target->parentNode;
			//削除するために親ノードを取得
			$nodes = $delNode->parentNode;
			//TOP要素の場合、EDGE紐付の削除はできない
			if(!$top->isSameNode($nodes)) {
				//削除実行
				$addNode = $nodes->removeChild($delNode);
				//NODESタグが空になった場合、NODESタグも削除
				if(!$nodes->hasChildNodes()) {
					$parent = $nodes->parentNode;
					$parent->removeChild($nodes);
				}
				//削除したノードをTOP要素に追加
				$top->appendChild($addNode);
			}
		}
		//テーブルへ登録するためBOK(XML形式)を返却
		return $this->dom->saveXML();
	}
	/**
	 * ノードの新規追加
	 * @param	$t	追加するノードの名称
	 */
	public function addNode($t) {
		$target = $this->searchNameNode($t);
		//同一名称のノードがない場合のみ処理する
		if($target === false) {
			//追加するノードの作成
			$addNode = $this->dom->createElement('node');
			$name = $addNode->appendChild($this->dom->createElement('name',$t));
			//TOP要素に追加
			$top = $this->dom->getElementsByTagName("nodes")->item(0);
			$top->appendChild($addNode);
			return $this->dom->saveXML();
		}
		else{
			return false;
		}
	}
	/**
	 * [複合処理]ノードを指定箇所に追加
	 * @param	$t	追加ノードの名称
	 * @param	$p	追加対象ノードの名称
	 */
	public function addNodeTo($t,$p) {
		//ノード追加
		if(($ret = $this->addNode($t)) !== FALSE) {
			//ノード移動
			$ret = $this->moveNode($t,$p);
		}
		return $ret;
	}
	/**
	 * ノードパスの重複判定
	 * @param	$a	(String)ノードA名称
	 * @param	$b	(String)ノードB名称
	 */
	public function check_hierarchy($a,$b) {
		$aNode = $this->searchNameNode($a);
		$bNode = $this->searchNameNode($b);
		
		//ノードBがノードAに含まれているか判定する
		$aPath = $this->getNodePath($aNode);
		$bPath = $this->getNodePath($bNode);
		//どちらかがルートの場合、必ず含む
		if(($aPath == "") || ($bPath == "")) {
			$result = 0;
		}
		else {
			$result = strpos($bPath,$aPath);
		}
		return $result;
	}
	/**
	 * ノードの階層を移動する
	 * @param	$t	移動の対象となるノード名称
	 * @param	$p	移動先のノード名称
	 */
	public function moveNode($t,$p) {
		//移動先のノードパスが移動対象のノードパスに含まれているか判定
		if($this->check_hierarchy($t,$p) === 0) {
			//完全に含まれている場合、親子関係が成立している...
			//付け替え不可
			return false;
		}
		//付け替え処理
		$top = $this->dom->getElementsByTagName("nodes")->item(0);
		$target = $this->searchNameNode($t);
		$move = $this->searchNameNode($p);
		if(!is_null($target) && !is_null($move)) {
			//名称の親ノードが削除対象
			$delNode = $target->parentNode;
			//削除するために親ノードを取得
			$nodes = $delNode->parentNode;
			//削除実行
			$addNode = $nodes->removeChild($delNode);
			//NODESタグが空になった場合、NODESタグも削除(TOP要素の場合を除く)
			if(!$top->isSameNode($nodes) && !$nodes->hasChildNodes()) {
				$parent = $nodes->parentNode;
				$parent->removeChild($nodes);
			}
			//削除したノードを移動先ノードに追加
			$moveTo = $move->parentNode;
			//nodesタグの有無を判定
			if(($addTo = $moveTo->getElementsByTagName('nodes')->item(0)) == null) {
				//ない場合には作成する
				$addTo = $moveTo->appendChild($this->dom->createElement('nodes'));
			}
			$addTo->appendChild($addNode);
			return $this->dom->saveXML();
		}
	}
	/**
	 * ノードの構造を取得する
	 * @param	$node	DOMNodeインスタンス
	 */
	private function getNodePath($node) {
		if(is_null($node) || $node == "") {
			return "";
		}
		//ノードパスを取得
		$path = $node->getNodePath();
		//一時的に区切り文字ごとの配列へ変換
		$ary_path = explode('/',$path);
		//
		$name = array_pop($ary_path);
		return implode('/',$ary_path);
	}
	/**
	 * XMLのツリー構造(ノード)を取得する
	 * @return array(KEY/VALUE => ノード名称/ノード階層(名称解決積み))
	 */
	public function getNodeTree() {
		$ret = array();
		$nodelist = $this->dom->getElementsByTagName("node");
		if($nodelist) {
			$result = array();
			foreach($nodelist as $node) {
				$key = $this->getNodeName($node);
				if($key != "root") {
					$result[$key] = BOKXML_SEPARATE_CHAR.
									"root".$this->compact_path($node->parentNode->getNodePath());
				}
				else {
					$result[$key] = BOKXML_SEPARATE_CHAR.
									$this->compact_path($node->parentNode->getNodePath());
				}
			}
		}
		return $result;
	}
	/**
	 * XMLノード階層を各ノード名称に変更したパスを作成する
	 * @param	$path XMLノードパス
	 */
	private function compact_path($path) {
		$aPath = explode('/',$path);
		$bPath = array();
		$res = array();
		//ツリー全体から対象のノードを検索
		$xPath = $this->getXPath();
		array_push($bPath,array_shift($aPath));
		while(count($aPath) > 0) {
			$p = array_shift($aPath);
			array_push($bPath,$p);
			//ノードの場合のみ名称タグからデータを取得
			if(preg_match('/node([^s])*$/',$p)===1) {
				$nodes = $xPath->query(implode('/',$bPath).'/name');
				if($nodes->length > 0) {
					$node = $nodes->item(0);
					$res[] = $node->textContent;
				}
			}
		}
		return implode(BOKXML_SEPARATE_CHAR,$res);
	}
	/**
	 * 編集用ノードパス文字列からその親ノードの名称を取得する
	 *  - XMLに存在しないノード名
	 */
	public function getNodeParent($eSet) {
		$key = key($eSet);
		$value = $eSet[$key];
		$a_path = explode(BOKXML_SEPARATE_CHAR,$value);
		$res = '';
		for($i=(count($a_path)-1);$i >= 0;$i--) {
			$p = $a_path[$i];
			if($this->searchNameNode($p) !== false) {
				$res = $p;
				break;
			}
		}
		return $res;
	}
	/**
	 * ノードの名称を取得する
	 * @param $node	対象ノード
	 */
	private function getNodeName($node) {
		//構造上ノードには名称タグが1つ
		$names = $node->getElementsByTagName("name");
		$name = $names->item(0);
		//名称なしの場合ルート扱い
		if(empty($name->textContent)) {
			$ret = "root";
		}
		else {
			$ret = $name->textContent;
		}
		return ($ret);
	}
	/**
	 * XML形式でデータを返却(疑似Overlap)
	 */
	public function saveXML() {
		return ($this->dom->saveXML());
	}
	/**
	 * ノードをXML変更した配列から、内部処理用の配列へ変換する
	 *  - 変換結果はクラス内のメンバへ格納される
	 */
	public function saveArray() {
		$result = array();
		$tree = $this->getNodeTree();
		foreach($tree as $key => $value) {
			$tmp = explode(BOKXML_SEPARATE_CHAR,$value);
			//array_pop($tmp);
			$k = array_pop($tmp);
			$v = htmlspecialchars($key);
			if($k == '') {
				continue;
			}
			$result[] = array(
				"p_name" => $k,
				"c_name" => $v
			);
		}
		return ($result);
	}
	/**
	 * D3.JS用のBOK-XMLリンクデータ取得
	 */
	public function getLinkData() {
		$result = array();
		$tree = $this->getNodeTree();
		foreach($tree as $key => $value) {
			$tmp = explode(BOKXML_SEPARATE_CHAR,$value);
			$k = array_pop($tmp);
			$v = htmlspecialchars($key);
			if($k == '') {
				continue;
			}
			if($k == 'root') {
				//単独記事の場合
				$result[] = array(
					'source' => $v,
					'target' => '',
					'type' => 'bok'
				);
			}
			else {
				//階層設定済みの場合
				$result[] = array(
					'source' => $k,
					'target' => $v,
					'type' => 'bok'
				);
			}
		}
		return ($result);
	}
	/**
	 * D3.JS用のBOK-XMLを一覧データとして取得
	 *  - TOP[root]との関係も出力
	 * @param	$type	設定するリンク種別名称
	 */
	public function getListData($type="bok") {
		$result = array();
		$tree = $this->getNodeTree();
		foreach($tree as $key => $value) {
			$tmp = explode(BOKXML_SEPARATE_CHAR,$value);
			$k = array_pop($tmp);
			$v = htmlspecialchars($key);
			if($k == '') {
				continue;
			}
			//階層設定済みの場合
			$result[] = array(
				'source' => $k,
				'target' => $v,
				'linkname' => $type
			);
		}
		return ($result);
	}
	/**
	 * 編集対象の構造を名称ごとの配列に変換
	 * @param	$eSet	(Array)	[名称=>パス]形式
	 * @param	$type	(Bool)	TRUE:自身を編集パスに含める/FALSE:含めない
	 * @return	(Array) [１操作 => ROOTからのノード名称]形式の多次元配列
	 */
	private function splitPath($eSet,$type) {
		$res = array();
		foreach($eSet as $k => $s) {
			$path = explode(BOKXML_SEPARATE_CHAR,$s);
			if($type) {
				//対象ノードが少なくなるよう、自身を含める場合
				array_push($path,$k);
			}
			$res[$k] = $path;
		}
		return $res;
	}
	/**
	 * 2つのノードから編集範囲を取得
	 *  - HEAD-MBT/WORK-MBTの両方を表示するための範囲を取得
	 * @param	$a	ノード名称1
	 * @param	$b	ノード名称2
	 */
	public function getEditArea($a,$b) {
		//どちらかがルートノードの場合、処理不要
		if($a == 'root' || $b == 'root') {
			return array('root'=>'');
		}
		//ノードパスを整形
		$aPath = BOKXML_SEPARATE_CHAR.
				 "root".$this->compact_path($this->searchNameNode($a)->getNodePath());
		$bPath = BOKXML_SEPARATE_CHAR.
				 "root".$this->compact_path($this->searchNameNode($b)->getNodePath());
		//ノード名称ごとにパスを分割
		$eSet = array(
			explode(BOKXML_SEPARATE_CHAR,$aPath),
			explode(BOKXML_SEPARATE_CHAR,$bPath)
		);
		//編集ありの場合
		if(count($eSet) > 0) {
			//すべての編集に含まれるパス階層を取得
			$res = array_shift($eSet);
			foreach($eSet as $e) {
				$res = array_intersect($res,$e);
			}
			//入力と同様の[名称=>パス]形式を戻り値とする
			$name = array_pop($res);
			$result = array($name => implode(BOKXML_SEPARATE_CHAR,$res));
		}
		return $result;
	}
	/**
	 * 各林ごとの先頭ノード(ツリー)を返却する
	 * @param $type		返却データをDOMNodeインスタンスと名称のみから  [NAME/NODE]選択
	 * @param $backType	返却する配列の形式を選択  [通常配列/名称配列/両方]
	 */
	public function getTopNodes($type='',$backType='') {
		//先頭ノードの親ノードを指定
		$top = $this->dom->getElementsByTagName("nodes")->item(0);
		//対象ノード検索の準備
		$xPath = $this->getXPath();
		//表示上の先頭ノード名称を取得(疑似TOPノードの子ノード名称を検索)
		$nodes = $xPath->query('node/name',$top);
		$res = array();
		$result = false;
		if($nodes->length > 0) {
			switch(strtoupper($type)) {
				case 'NAME':
					//ノードの名称のみを返却
					for($i=0 ; $i < $nodes->length ; $i++) {
						$node  = $nodes->item($i);
						$res['NUMBER'][$i] = $node->textContent;
						$res['ASSOC'][$node->textContent] = $node->textContent;
					}
					break;
				case 'NODE':
				default:
					//DOMNodeインスタンスを返却
					for($i=0 ; $i < $nodes->length ; $i++) {
						$node  = $nodes->item($i);
						$res['NUMBER'][$i] = $node;
						$res['ASSOC'][$node->textContent] = $node;
					}
					break;
			}
			//返却データを選択
			switch(($_backType = strtoupper($backType))) {
				case 'NUMBER':
				case 'ASSOC':
					$result = $res[$_backType];
					break;
				case 'BOTH':
				default:
					$result = $res['NUMBER'] + $res['ASSOC'];
			}
			//データが有無を確認
			if(count($result) < 1) {
				$result = FALSE;
			}
		}
		return $result;
	}
	/**
	 * データベースに格納しているBOK-XMLが林状態の場合にそれぞれのノードに分割する
	 */
	public function splitBokTree() {
		$result = array();
		//先頭ノードのみを抽出
		$nodes = $this->getTopNodes('NAME','NUMBER');
		if($nodes !== FALSE) {
			foreach($nodes as $name) {
				//先頭ノード名称ごとに新規DOMDocumentとして配列化
				$result[$name] = new BokXml($this->getUnderNode($name));
			}
		}
		return $result;
	}
	/**
	 * EditSetから最小境界木のトップノード名称を取得
	 * @param	$editSet	(Array)編集内容
	 * @return	[変更あり](Array) [名称=>パス]形式
	 *			[変更なし](Bool)  FALSE
	 */
	public function getMbtNode($editSet) {
		//戻り値の初期化
		$result = false;
		//追加/削除処理ごとに対象ノードパスの名称を配列化
		$iSet = $this->splitPath($editSet["add"],BOKXML_INSNODE_FULL);
		$dSet = $this->splitPath($editSet["del"],BOKXML_DELNODE_FULL);
		//編集対象パス構造の和集合を取得(編集ノード名称[KEY]は不要)
		$eSet = array_merge(array_values($iSet) ,array_values($dSet));
		//編集ありの場合
		if(count($eSet) > 0) {
			//すべての編集に含まれるパス階層を取得
			$res = array_shift($eSet);
			foreach($eSet as $e) {
				$res = array_intersect($res,$e);
			}
			//入力と同様の[名称=>パス]形式を戻り値とする
			$name = array_pop($res);
			$result = array($name => implode(BOKXML_SEPARATE_CHAR,$res));
		}
		return $result;
	}
}
