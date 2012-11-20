<?php
/**
 * Specail page Class
 * @addtogroup wikiboksystem
 * @author Aoyama Univ.
 */
class BokEditor extends IncludableSpecialPage {
	/**
	 * コンストラクタ
	 */
	public function __construct() {
		global $wgOut;
		parent::__construct('BokEditor');
		$wgOut->setPageTitle(wfMsg('bokeditor'));
	}
	/**
	 * 出力実行
	 */
	public function execute( $target ) {
		global $wgUser,$wgOut,$wgRequest;

		//ログイン状態の確認
		$login = $wgUser->isLoggedIn();
		//編集権限の確認
		$edit = $wgUser->isAllowed('edit');

		//ログイン状態の確認
		$userlogin = $wgUser->isLoggedIn();
		//確認モード...
		$act = $wgRequest->getVal('action');
		switch($act) {
			case 'load':
				break;
			case 'history':
				$wgOut->addHTML($this->getRevPanel($login));
				break;
			default:
				//リビジョン表示/編集機能
				$wgOut->addHTML($this->getRevPanel($login));
				$wgOut->addHTML($this->getEditPanel($login));
				break;
		}
	}
	/**
	 * リビジョン情報パネル作成
	 * @param	$login	ログイン状態(TRUE:ログイン中/FALSE:ログアウト中)
	 */
	private function getRevPanel($login) {
		//BOKリビジョン情報表示パネル
		$txt = '<div id="rev">';
		if($login) {
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
	private function getEditPanel($login) {
		//編集用パネル
		$txt  = '<div id="wikibok-edit">';
		//ログインしていない場合、編集させない
		$txt .= ($login) ? '<span class="icon32 checked">'.wfMsg('wikibok-select-cancel').'</span>' : '';
		$txt .= '<span class="icon32 help">'.wfMsg('wikibok-icon-help').'</span>';
		$txt .= ($login) ? '<span class="icon32 new">'.wfMsg('wikibok-add-newnode').'</span>' : '';
		$txt .= ($login) ? '<span class="icon32 commit">'.wfMsg('wikibok-bokxml-commit').'</span>' : '';
		$txt .= '<span class="icon32 print">'.wfMsg('wikibok-pdf-download').'</span>';
		$txt .= ($login) ? '<span class="icon32 save_as">'.wfMsg('wikibok-bokxml-save').'</span>' : '';
		$txt .= ($login) ? '<span class="icon32 undo">'.wfMsg('wikibok-bokxml-undo').'</span>' : '';
		$txt .= ($login) ? '<span class="icon32 redo">'.wfMsg('wikibok-bokxml-redo').'</span>' : '';
		$txt .= '</div>';
		$txt .= '<iframe id="wikibok-dwn" src="" style="display:none"></iframe>';
		return "{$txt}\n";
	}
}
