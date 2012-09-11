<?php
/**
 * Specail page Class
 * @addtogroup wikiboksystem
 * @author Aoyama Univ.
 */
class DescriptionEditor extends IncludableSpecialPage {
	/**
	 * コンストラクタ
	 */
	public function __construct() {
		global $wgOut;
		parent::__construct('DescriptionEditor');
		$wgOut->setPageTitle(wfMsg('descriptioneditor'));
	}
	/**
	 * 出力実行
	 */
	public function execute( $target ) {
		global $wgOut,$wgUser;
		//ログイン状態の確認
		$login = $wgUser->isLoggedIn();
		//編集権限の確認
		$edit = $wgUser->isAllowed('edit');
		//リビジョン表示/編集機能
		$wgOut->addHTML($this->getRevPanel($login,$edit));
		$wgOut->addHTML($this->getEditPanel($edit));
	}
	/**
	 * リビジョン情報パネル作成
	 * @param	$login	ログイン状態(TRUE:ログイン中/FALSE:ログアウト中)
	 */
	private function getRevPanel($login,$edit) {
		//BOKリビジョン情報表示パネル
		$txt  = '<div id="rev">';
		if($login && $edit) {
			$txt .= '<div>'.wfMsg('wikibok-basename').'-'.wfMsg('wikibok-revisionname').'.<span class="base"/></div>';
			$txt .= '<div>'.wfMsg('wikibok-headname').'-'.wfMsg('wikibok-revisionname').'.<span class="head"/></div>';
			$txt .= '<div>'.wfMsg('wikibok-editcount').'&nbsp;.<span class="edit"/></div>';
		}
		else {
			$txt .= '<div>'.wfMsg('wikibok-viewname').'-'.wfMsg('wikibok-revisionname').'.<span class="base"/></div>';
		}
		$txt .= '</div>';
		return "{$txt}\n";
	}
	/**
	 * 編集用パネル作成
	 * @param	$login	ログイン状態(TRUE:ログイン中/FALSE:ログアウト中)
	 */
	private function getEditPanel($edit) {
		$txt  = '<div id="wikibok-edit">';
		//ログインは編集メニューに関係しない...
		if($edit) {
			$txt .= '<span class="icon32 new">'.wfMsg('wikibok-add-article').'</span>';
		}
		//PDF出力
		$txt .= '<span class="icon32 print">'.wfMsg('wikibok-pdf-download').'</span>';
		$txt .= '</div>';
		$txt .= '<iframe id="wikibok-dwn" src="" style="display:none"></iframe>';
		return "{$txt}\n";
	}

}
