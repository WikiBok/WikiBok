var
	WINDOW_APP = WINDOW_APP || {};

WINDOW_APP.util = {};


/**
 * スクロールの監視
 *
 * @class
 * @author	ngi@phantom4.org
 * @example
 *
 * /**
 *  * スクロールの監視イベント
 *  *
 *  * @param params {Object} 監視中のパラメーター
 *  * @param params.status {int} 0: スクロール停止した、1: スクロール開始した、2: スクロール中
 *  * @param params.positionX {Number} 縦スクロールの位置
 *  * @param params.positionY {Number} 横スクロールの位置
 *  * @param params.deltaX {Number} 縦スクロールの移動量
 *  * @param params.deltaY {Number} 横スクロールの移動量
 *  *\/
 * function onScroll (params) {
 * 	switch(params.status) {
 * 		case 0:
 * 			//スクロール停止したときの処理
 * 			break;
 *
 * 		case 1:
 * 			//スクロール開始したときの処理
 * 			break;
 *
 * 		case 2:
 * 			//スクロール中の処理
 * 			break;
 * 	}
 * }
 *
 * WINDOW_APP.util.scrollMonitor.add(onScroll);	//リスナー追加
 */


WINDOW_APP.util.scrollMonitor = (function () {
	var
		_DELAY = 100,

		_isPlaying = false,	//動作中か
		_listeners = [],	//リスナー
		_numListener = 0,	//追加された要素の数
		_timer,	//タイマー
		_isScrolling = false,	//スクロール中か
		_prevPoint = {
			x: 0,
			y: 0
		};	//前回のスクロール座標

	/**
	 * イベントを追加する
	 *
	 * @param	func {Function} リスナー
	 * @return	{Boolean} 追加されたか
	 */
	function add (func) {
		var
			result = false,	//結果
			isAdded = false;	//すでに追加されているか

		if(typeof func === "function") {
			//同じものがあれば上書き
			for(var i = 0; i < _numListener; i++) {
				if(_listeners[i] === func) {
					_listeners[i] = func;
					isAdded = true;
					break;
				}
			}

			if(!isAdded) {
				_listeners.push(func);
				_numListener++;
			}
		}

		//動作開始
		if(!_isPlaying && _numListener > 0) {
			start();
		}

		return result;
	}

	/**
	 * イベントを削除する
	 *
	 * @param	func {Function} リスナー
	 * @return	{Boolean} 削除されたか
	 */
	function remove (func) {
		var result = false;
		for(var i = 0; i < _numListener; i++) {
			//一致したリスナーを削除
			if(_listeners[i] === func) {
				delete _listeners[i];
				_numListener--;
				break;
			}
		}

		//動作終了
		if(_numListener <= 0) {
			stop();
		}

		return result;
	}

	/**
	 * モニターの開始（手動で実行する場合）
	 *
	 */
	function start () {
		stop();

		//開始時のスクロール位置を保持
		_prevPoint.x = document.documentElement.scrollLeft || document.body.scrollLeft;
		_prevPoint.y = document.documentElement.scrollTop || document.body.scrollTop;

		_timer = setInterval(_monitor, _DELAY);
		_isPlaying = true;
	}

	/**
	 * モニターの停止（手動で実行する場合）
	 *
	 */
	function stop () {
		if(_timer) {
			clearInterval(_timer);
		}
		_isPlaying = false;
	}

	/**
	 * 監視＆通知
	 *
	 */
	function _monitor () {
		var
			top = document.documentElement.scrollTop || document.body.scrollTop,	//スクロール上
			left = document.documentElement.scrollLeft || document.body.scrollLeft,	//スクロール左
			isMove = false,	//移動したか
			status = -1;	//スクロール開始、停止、スクロール中

		if(_prevPoint.x != left) {
			isMove = true;
		}

		if(_prevPoint.y != top) {
			isMove = true;
		}

		//ステータスの設定
		if(isMove && _isScrolling) {
			status = 2;	//スクロール中
		}
		else if (isMove && !_isScrolling) {
			status = 1;	//スクロール開始
		}
		else if (!isMove && _isScrolling) {
			status = 0;	//スクロール停止
		}

		//通知
		if(status >= 0) {
			for(var i = 0; i < _numListener; i++) {
				_listeners[i].apply(window, [{
					status: status,
					positionX: left,	//x座標
					positionY: top,	//y座標
					deltaX: left - _prevPoint.x,	//x座標の移動量
					deltaY: top - _prevPoint.y	//y座標の移動量
				}]);
			}
		}

		_isScrolling = isMove;
		_prevPoint.x = left;
		_prevPoint.y = top;
	}


	return {
		add: add,
		remove: remove,
		start: start,
		stop: stop
	};
}());