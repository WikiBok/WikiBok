<?php
/**
 * Specail page Class
 * @addtogroup wikiboksystem
 * @author Aoyama Univ.
 */
require_once("config/setting.php");
class BokSaveList extends IncludableSpecialPage {
	/**
	 * コンストラクタ
	 */
	public function __construct() {
		global $wgOut;
		parent::__construct('BokSaveList');
		$wgOut->setPageTitle(wfMsg('boksavelist'));
	}
	/**
	 * 出力実行
	 */
	public function execute( $target ) {
		global $wgScript,$wgOut,$wgRequest;
		$request = $wgRequest;
		$out = $wgOut;
		
		//GET Values
		$action = $request->getVal('action','view');
		$user = $request->getText( 'user_id' );
		$save_title = $request->getText( 'save_title' );
		switch($action) {
			case 'list':
				$fyear  = $request->getInt( 'fromdate-year' ,'');
				$fmonth = $request->getInt( 'fromdate-month','');
				$tyear  = $request->getInt( 'todate-year'   ,'');
				$tmonth = $request->getInt( 'todate-month'  ,'');
				break;
			default:
				//デフォルトの期間は直近の1ヶ月
				$def_from = mktime(0,0,0,date('m')-1,date('d'),date('Y'));
				$fyear  = $request->getInt( 'fromdate-year' ,date('Y',$def_from));
				$fmonth = $request->getInt( 'fromdate-month',date('n',$def_from));
				$tyear  = $request->getInt( 'todate-year'   ,date('Y'));
				$tmonth = $request->getInt( 'todate-month'  ,date('n'));
				break;
		}
		$url = htmlspecialchars( $wgScript );
		//条件入力フォーム
		$out->addHTML(
			"<form action=\"$url\" method=\"post\" id=\"wbs-searchform\">" .
			Xml::fieldset(
				wfMsg( 'wbs-search-fieldset-title' ),
				false,
				array( 'id' => 'wbs-search' )
			) .
			Xml::element('input',array('type'=>'hidden','id'=>'title','name'=>'title','value'=> $this->getTitle()->getPrefixedDBKey()) ) . "\n" .
			Xml::element('input',array('type'=>'hidden','id'=>'action','name'=>'action','value'=> 'list') ) . "\n" .
			wfMsg( 'wbs-search-fieldset-fromto' ) .'<br/>'.
			$this->_dateMenu( $fyear, $fmonth ,'wbs-search-fieldset-fromdate','fromdate') . '&#160;'.
			$this->_dateMenu( $tyear, $tmonth ,'wbs-search-fieldset-todate','todate') .
			Xml::element('br').
			Xml::label(wfMsg( 'wbs-search-fieldset-user' ), 'user_id') .'&#160;'.
			Xml::input('user_id', null, $user, array('id' => 'user_id')).'&#160;'.
			Xml::label(wfMsg( 'wbs-search-fieldset-savetitle' ), 'save_title' ) .'&#160;'.
			Xml::input('save_title', null, $save_title, array('id' => 'save_title')).'&#160;'.
			Xml::submitButton(wfMsg('wbs-search-fieldset-submit')).
			'</fieldset></form>'
		);
		//入力データ整形(日付補正)
		if($fmonth < 0 || empty($fyear)) {
			$from = '';
		}
		else {
			if(($from = mktime(0,0,0,$fmonth,1,$fyear))===FALSE) {
				$from = '';
			}
			else {
				$from = date('Y/m/d H:i:s',$from);
			}
		}
		if($tmonth < 0 || empty($tyear)) {
			$to = '';
		}
		else {
			if(($to = mktime(23,59,59,$tmonth+1,0,$tyear))===FALSE) {
				$to = '';
			}
			else {
				$to = date('Y/m/d H:i:s',$to);
			}
		}
		//DB問い合わせ
		$db = new RevisionDB();
		$rows = $db->getSaveList($from,$to,$user,$save_title);
		if($rows != FALSE) {
			//データ表示
			$out->addHTML(
				$this->_pager().
				Xml::openElement('table', array('id' => 'list_result', 'class' => 'wbs_list_result tablesorter'))
			);
			//ヘッダ
			$out->addHTML(
				Xml::openElement('thead').
				Xml::openElement('tr').
				Xml::element('th',null,wfMsg('wbs-list-result-savetitle')).
				Xml::element('th',null,wfMsg('wbs-list-result-comment')).
				Xml::element('th',null,wfMsg('wbs-list-result-user')).
				Xml::element('th',null,wfMsg('wbs-list-result-time')).
				Xml::element('th',null,wfMsg('wbs-list-result-link')).
				Xml::closeElement('tr').
				Xml::closeElement('thead').
				Xml::openElement('tbody')
			);
			//データ
			foreach($rows as $row) {
				$_user = User::whoIs($row['user_id']);
				$out->addHTML(
					Xml::openElement('tr').
					Xml::element('td',null,$row['title']).
					//UTF-8(3byte)で30文字を切り出し
					Xml::element('td',null,mb_substr($row['comment'],0,30)).
					Xml::element('td',null,$_user).
					Xml::element('td',null,$row['time']).
					Xml::openElement('td').
					xml::element('a',array('href'=>$url.'/Special:BokEditor?action=load&user='.urlencode($_user).'&stitle='.urlencode($row['title']),'target'=>'_blank'),'○').
					Xml::closeElement('td').
					Xml::closeElement('tr')
				);
			}
			$out->addHTML(
				Xml::closeElement('tbody').
				Xml::closeElement('table').
				$this->_pager()
			);
		}
		else {
			//データなし
			$out->addHTML(
				Xml::element('div', array('id' => 'list_result', 'class' => 'wbs_list_result'),wfMsg('wbs-list-result-nodata'))
			);
		}
	}
	/**
	 * ページャHTML作成
	 */
	private function _pager($selected='') {
		for($page=50;$page <= 350;$page+=50) {
			$options[] = Xml::option($page, $page, $selected===$page);
		}
		return Xml::openElement('div',array('class'=>'wbs_list_result_pager pager')).
			Xml::element('span',array('class'=>'icon16 first'),wfMsg('wikibok-pager-first')).
			Xml::element('span',array('class'=>'icon16 prev'),wfMsg('wikibok-pager-prev')).
			Xml::element('input',array('type'=>'text','class'=>'pagedisplay','readonly'=>'readonly','title'=>wfMsg('wikibok-pager-view')),'').
			Xml::element('span',array('class'=>'icon16 next'),wfMsg('wikibok-pager-next')).
			Xml::element('span',array('class'=>'icon16 last'),wfMsg('wikibok-pager-last')).
			Xml::openElement('select',array('class'=>'pagesize')).
			implode("\n",$options).
			Xml::closeElement('select').
			Xml::closeElement('div');
	}
	/**
	 * @param $year Integer
	 * @param $month Integer
	 * @param $label String
	 * @param $class String
	 * @return string Formatted HTML
	 */
	private function _dateMenu( $year, $month , $label, $class) {
		# Offset overrides year/month selection
		if( $month && $month !== -1 ) {
			$encMonth = intval( $month );
		} else {
			$encMonth = '';
		}
		if( $year ) {
			$encYear = intval( $year );
		} elseif( $encMonth ) {
			$thisMonth = intval( gmdate( 'n' ) );
			$thisYear = intval( gmdate( 'Y' ) );
			if( intval($encMonth) > $thisMonth ) {
				$thisYear--;
			}
			$encYear = $thisYear;
		} else {
			$encYear = '';
		}
		return Xml::label( wfMsg( $label ), $label ) . ' '.
			Xml::input( $class.'-year', 4, $encYear, array('id' => $label, 'maxlength' => 4,'class'=>$class.'-year') ).
			wfMsg('wbs-search-fieldset-year').
			$this->_monthSelector( $encMonth , -1, $class.'-month');
	}
	/**
	 * Create a date selector
	 *
	 * @param $selected Mixed: the month which should be selected, default ''
	 * @param $allmonths String: value of a special item denoting all month. Null to not include (default)
	 * @param $id String: Element identifier
	 * @return String: Html string containing the month selector
	 */
	private function _monthSelector( $selected = '', $allmonths = null, $id = 'month' ) {
		global $wgLang;
		$options = array();
		if( is_null( $selected ) )
			$selected = '';
		if( !is_null( $allmonths ) )
			$options[] = Xml::option( wfMsg( 'monthsall' ), $allmonths, $selected === $allmonths );
		for( $i = 1; $i < 13; $i++ )
			$options[] = Xml::option( $wgLang->getMonthName( $i ), $i, $selected === $i );
		//複数設定する必要があるため、name属性に$IDを設定
		return Xml::openElement( 'select', array( 'id' => $id, 'name' => $id, 'class' => 'mw-month-selector' ) )
			. implode( "\n", $options )
			. Xml::closeElement( 'select' );
	}

}
