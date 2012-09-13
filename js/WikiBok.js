jQuery(function($) {
	//ログイン処琁E
	function wikiLogin(param,sfunc,nfocus) {
		var me = this,
				_param = $.extend({},{
					action : 'login'
				},param);
		$.wikibok.requestAPI(
			_param,
			function(dat,stat,xhr) {
				var res = dat['login']['result'],
						token = dat['login']['token'];
				//通信失敗
				if(res == undefined) {
					$.wikibok.exDialog(
						$.wikibok.wfMsg('wikibok-popupLogin','title')+' '+$.wikibok.wfMsg('common','error'),
						'',
						{
							open : function(ev,ui) {
								$(this).html($.wikibok.wfMsg('wikibok-popupLogin','error',res.toLowerCase()));
							},
							close : function() {
								//フォーカス移勁E
								$('#'+nfocus).find('input:first').focus();
							}
						}
					);
				}
				else {
					switch(res.toLowerCase()) {
						//トークンが必要な場合、レスポンスデータから設定して再実行
						case 'needtoken':
							setTimeout(function() {
								var _next = $.extend({},param,{
											lgtoken : token
										});
								wikiLogin(_next,sfunc,nfocus);
							},1);
							break;
						//ログイン成功
						case 'success':
							if((sfunc == undefined) || (!$.isFunction(sfunc))) {
								//[デフォルト]メッセージ表示
								$.wikibok.exDialog(
									$.wikibok.wfMsg('wikibok-popupLogin','title')+' '+$.wikibok.wfMsg('common','success'),
									$.wikibok.wfMsg('wikibok-popupLogin','success'),
									{
										close : function() {
											//リロードしてユーザ情報を更新...
											setTimeout(function(){location.reload(true);},100);
										}
									}
								);
							}
							else {
								sfunc.apply(me,arguments);
							}
							break;
						//ユーザなしやパスワードエラーなど
						default:
							$.wikibok.exDialog(
								$.wikibok.wfMsg('wikibok-popupLogin','title')+' '+$.wikibok.wfMsg('common','error'),
								'',
								{
									open : function(ev,ui) {
										$(this).html($.wikibok.wfMsg('wikibok-popupLogin','error',res.toLowerCase()));
									},
									close : function() {
										//フォーカス移動
										$('#'+nfocus).find('input:first').focus();
									}
								}
							);
							break;
					}
				}
			},
			function(xhr,stat,err) {
				$.wikibok.exDialog(
					$.wikibok.wfMsg('wikibok-popupLogin','title')+' '+$.wikibok.wfMsg('common','error'),
					'',
					{
						open : function(ev,ui) {
							$(this).html($.wikibok.wfMsg('wikibok-popupLogin','error','other'));
						},
						close : function() {
							//フォーカス移勁E
							$('#'+nfocus).find('input:first').focus();
						}
					}
				);
				
			}
		);
	}
	//Ajax処理によるローディング表示
	$('#wikibok-loading')
		.setPosition({position : 'lt'})
		.on('ajaxStart', function(){
			$(this).show();
		})
		.on('ajaxStop', function(){
			$(this).hide();
		});
	//ページ破棄前にすべてのajax通信を停止
	$('body').on('ajaxSend',function(c,xhr) {
		$(window).one('beforeunload',function(){
			xhr.abort();
		})
	});
	//アイコン設定
	$('.ui-icon-inline,.icon16').lineicon({width:'16px',height:'16px'});
	$('.icon32').lineicon({width:'32px',height:'32px'});
	$('.wikibok-descriptioneditor-tooltip').lineicon({width:'16px',height:'16px'},'.inIcon');

	//位置固定
	$('#rev').setPosition({position : 'rb',y : 60}).revision();
	$('#wikibok-sns').setPosition({position : 'lt'},true);

	//表示統一のため、リンク要素を変換
	$('#wikibok-tooltip').find('li:has(a)').each(function() {
		var _wrap = $('<div></div>').addClass('hide hover linkitem'),
			_a = $(this).find('> a');
		//リンク情報を親要素へ移動
		$(this).attr({
			href : _a.attr('href'),
			title : _a.attr('title')}).html(_a.html()).wrap(_wrap);
		//リンクタグを削除
		_a.remove();
	});

//ツールチップ
	$('#wikibok-tooltip')
		//位置固定
		.setPosition({position : 'rt'},true)
		//表示/非表示切り替え
		.on('click','div.wikibok-link',function() {
			var elem = $(this).get(0),
				_count = $.data(elem,'click');
			//$.toggleと同様の動作をさせる(設定イベントを順番に実行)
			switch(_count) {
				case 1:
					$(this).find('.hide').hide();
					$(this).find('.ui-icon').addClass('ui-icon-circle-arrow-e');
					$(this).find('.ui-icon').removeClass('ui-icon-circle-arrow-s');
					break;
				case 0:
				default:
				//初回 Or 設定イベント回数以上になった場合
					$(this).find('.hide').show();
					$(this).find('.ui-icon').addClass('ui-icon-circle-arrow-s');
					$(this).find('.ui-icon').removeClass('ui-icon-circle-arrow-e');
					//実施カウント数を初期化
					_count = 0;
					break;
			}
			//実施回数をカウントアップ
			_count = _count + 1;
			$.data(elem,'click',_count);
		})
		//ログイン処理
		.on('click','li.wikibok-login',function() {
			$.wikibok.exDialog(
				$.wikibok.wfMsg('wikibok-popupLogin','title'),
				$('#wikibok-popupLogin'),
				{
					modal : true,
					open : function(ev,ui) {
						$(this).dialog('widget').setInterruptKeydown([
							{class : 'user',next : 'pass',prev : 'close'},
							{class : 'pass',next : 'commit',prev : 'user'}
						]);
					},
					buttons : [{
						text : $.wikibok.wfMsg('wikibok-popupLogin','button1','text'),
						title: $.wikibok.wfMsg('wikibok-popupLogin','button1','title'),
						class: $.wikibok.wfMsg('wikibok-popupLogin','button1','class'),
						click: function() {
							var u = $(this).find('.user').val() || '',
									p = $(this).find('.pass').val() || '',
									j = (u == '') ? 'emptyid' : ((p == '') ? 'emptypass' : 'other');
							wikiLogin({
									lgname : u,
									lgpassword : p
								},
								null,
								$.wikibok.wfMsg('wikibok-popupLogin','title')
							);
						}
					},{
						text : $.wikibok.wfMsg('common','button_close','text'),
						title: $.wikibok.wfMsg('common','button_close','title'),
						class: $.wikibok.wfMsg('common','button_close','class'),
						click: function() {
							$(this).dialog('close');
						}
					}],
					close : function(ev,ui) {
						$(this).find('input:text,input:password,input:checkbox,input:radio').each(function(){
							$(this).val('');
							$(this).removeAttr('checked');
						})
					}
				}
			);
		})
		//ログアウト処理
		.on('click','li.wikibok-logout',function() {
			$.wikibok.requestAPI({
				action : 'logout'
			},function() {
				$.wikibok.exDialog(
					$.wikibok.wfMsg('wikibok-popupLogout','title'),
					$.wikibok.wfMsg('wikibok-popupLogout','text'),
					{close : function() {setTimeout(function() {location.reload(true)},10);}}
				);
			});
		})
		//別画面への遷移前確認処理
		.on('click','li.wikibok-linkcaution',function(e) {
			var t = $(e.target);
			if(t.hasClass('selected')) {
				//選択中の場合、遷移しない
				return true;
			}
			$.wikibok.exDialog(
				$.wikibok.wfMsg('wikibok-linkcaution','title'),
				$.wikibok.wfMsg('wikibok-linkcaution','text'),
				{
					height : $.wikibok.wfMsg('wikibok-linkcaution','height'),
					width : $.wikibok.wfMsg('wikibok-linkcaution','width'),
					buttons : [{
						text : $.wikibok.wfMsg('common','button_ok','text'),
						title: $.wikibok.wfMsg('common','button_ok','title'),
						class: $.wikibok.wfMsg('common','button_ok','class'),
						click: function() {
							//リンク先データの設定(ページ名称補完)
							var	_h = t.attr('href'),
									_name = $.wikibok.getPageName(),
									_uri = (wgCanonicalSpecialPageName || (_name.length < 1)) ? _h : _h+'#'+encodeURIComponent(_name);
							$(this).dialog('close');
							location.href = _uri;
						}
					},{
						text : $.wikibok.wfMsg('common','button_close','text'),
						title: $.wikibok.wfMsg('common','button_close','title'),
						class: $.wikibok.wfMsg('common','button_close','class'),
						click: function() {
							$(this).dialog('close');
						}
					}]
				}
			);
		});
//編集ツール(共通)
	$('#wikibok-edit')
		.setPosition({position : 'rb'},true)
		.on('click','.print',function() {
			var svgs = $('svg').parent().each(function(){
					return $(this).html()
				});
			if(svgs != undefined) {
				for(var i = 0;i < svgs.length; i++) {
					var svg = jQuery(svgs[i]).html();
					$.wikibok.requestCGI(
						'WikiBokJs::svg2pdf',
						[svg],
						function(result) {
							//PDF化したものをダウンロード
							$('#wikibok-dwn').attr('src',wgScript+'?action=ajax&rs=WikiBokJs::download_pdf&rsargs[]='+result['outfile']);
							return false;
						},
						function() {},
						false
					);
				}
			}
			
		});
//イベント定義
	$(document)
		.on('click','.remine',function(e) {
			//パスワード変更処理
			$.wikibok.exDialog(
				$.wikibok.wfMsg('wikibok-change-password','title'),
				$('#wikibok-changepass'),
				{
					modal : true,
					open : function(ev,ui) {
						$(this).dialog('widget').setInterruptKeydown([
							{class : 'user',next : 'oldpass', prev : 'commit'},
							{class : 'oldpass',next : 'pass', prev : 'user'},
							{class : 'pass',next : 'repass', prev : 'oldpass'},
							{class : 'repass',next : 'commit', prev : 'pass'}
						]);
					},
					buttons : [{
						text : $.wikibok.wfMsg('wikibok-change-password','button','text'),
						title: $.wikibok.wfMsg('wikibok-change-password','button','title'),
						class: $.wikibok.wfMsg('wikibok-change-password','button','class'),
						click: function() {
							var _us = $(this).find('.user').val() || false,
								_op = $(this).find('.oldpass').val() || false,
								_np = $(this).find('.pass').val() || false,
								_rp = $(this).find('.repass').val() || false,
								j = ((_us && _op && _np && _rp) == false) ? 'EmptyItem' : ((_np != _rp) ? 'WrongPass' : true);
							if(j == true) {
								//旧パスワード確認
								wikiLogin({
										lgname : _us,
										lgpassword : _op
									},
									function(dat,stat,xhr) {
										var res = dat['login']['result'].toLowerCase();
										if(res == 'success') {
											$.wikibok.requestAPI({
													action:'logout'
												},function(_d,_s,_x) {
													$.wikibok.requestCGI(
														'WikiBokJs::changePass',
														[_us,_np],
														function(r) {
															if(r.res == true) {
																var w = $.wikibok.uniqueID('dialog',$.wikibok.wfMsg('wikibok-change-password','title'));
																$('#'+w).dialog('close');
																//パスワード変更成功
																$.wikibok.exDialog(
																	$.wikibok.wfMsg('wikibok-change-password','title')+' '+$.wikibok.wfMsg('common','success'),
																	$.wikibok.wfMsg('wikibok-change-password','success'),
																	{
																		close : function() {
																			wikiLogin({
																					lgname : _us,
																					lgpassword : _np
																				},function() {
																					//リロードしてユーザ惁E��を更新...
																					setTimeout(function(){location.reload(true);},100);
																				}
																			);
																		}
																	}
																);
															}
															else {
																//エラー表示
																$.wikibok.exDialog(
																	$.wikibok.wfMsg('wikibok-change-password','title')+' '+$.wikibok.wfMsg('common','error'),
																	'',
																	{open : function() {$(this).html(r.message);}}
																);
															}
														},
														function() {},
														false
													);
												}
											);
										}
									},
									$.wikibok.uniqueID('dialog',$.wikibok.wfMsg('wikibok-change-password','title'))
								);
							}
							else {
								//メッセージをオープン時に変更する...
								var mes = $.wikibok.wfMsg('wikibok-change-password','error',j);
								$.wikibok.exDialog(
									$.wikibok.wfMsg('wikibok-change-password','title')+' '+$.wikibok.wfMsg('common','error'),
									'',
									{
										open : function(ev,ui) {$(this).html(mes)},
										close : function() {
											var w = $.wikibok.uniqueID('dialog',$.wikibok.wfMsg('wikibok-change-password','title'));
											$('#'+w).find('.user').focus();
										}
									}
								);
							}
						}
					},{
						text : $.wikibok.wfMsg('common','button_close','text'),
						title: $.wikibok.wfMsg('common','button_close','title'),
						class: $.wikibok.wfMsg('common','button_close','class'),
						click: function() {
							$(this).dialog('close');
						}
					}],
					close : function(ev,ui) {
						$(this).find('input:text,input:password,input:checkbox,input:radio').each(function(){
							$(this).val('');
							$(this).removeAttr('checked');
						})
					}
				}
			);
		})
		.on('click','.adduser',function(e) {
			//新規アカウント作�E処琁E
			$.wikibok.exDialog(
				$.wikibok.wfMsg('wikibok-create-user','title'),
				$('#wikibok-createaccount'),
				{
					modal : true,
					open : function(ev,ui) {
						$(this).dialog('widget').setInterruptKeydown([
							{class : 'user',next : 'pass', prev : 'commit'},
							{class : 'pass',next : 'repass', prev : 'user'},
							{class : 'repass',next : 'email', prev : 'pass'},
							{class : 'email',next : 'realname', prev : 'repass'},
							{class : 'realname',next : 'commit', prev : 'email'}
						]);
					},
					buttons : [{
						text : $.wikibok.wfMsg('wikibok-create-user','button','text'),
						title: $.wikibok.wfMsg('wikibok-create-user','button','title'),
						class: $.wikibok.wfMsg('wikibok-create-user','button','class'),
						click: function() {
							var _us = $(this).find('.user').val() || false,
								_np = $(this).find('.pass').val() || false,
								_rp = $(this).find('.repass').val() || false,
								_em = $(this).find('.email').val() || false,
								_rn = $(this).find('.realname').val() || false,
								j = ((_us && _np && _rp && _em && _rn) == false) ? 'EmptyItem' : ((_np != _rp) ? 'WrongPass' : true);
							if(j == true) {
								//CGIリクエスト(アカウント作成)
								$.wikibok.requestCGI(
									'WikiBokJs::createUserAccount',
									[_us,_np,_em,_rn],
									function(r) {
										if(r.res == true) {
											var w = $.wikibok.uniqueID('dialog',$.wikibok.wfMsg('wikibok-create-user','title'));
											$('#'+w).dialog('close');
											//ログイン処理実施
											$.wikibok.exDialog(
												$.wikibok.wfMsg('wikibok-create-user','title')+' '+$.wikibok.wfMsg('common','success'),
												$.wikibok.wfMsg('wikibok-create-user','success'),
												{close : function() {wikiLogin({lgname : _us,lgpassword : _np})}}
											);
										}
										else {
											//エラー表示
											$.wikibok.exDialog(
												$.wikibok.wfMsg('wikibok-create-user','title')+' '+$.wikibok.wfMsg('common','error'),
												'',
												{open : function() {$(this).html(r.message);}}
											);
										}
									},
									function() {},
									false
								);
							}
							else {
								//メッセージをオープン時に変更する...
								var mes = $.wikibok.wfMsg('wikibok-create-user','error',j);
								$.wikibok.exDialog(
									$.wikibok.wfMsg('wikibok-create-user','title')+' '+$.wikibok.wfMsg('common','error'),
									'',
									{
										open : function(ev,ui) {$(this).html(mes)},
										close : function() {
											var w = $.wikibok.uniqueID('dialog',$.wikibok.wfMsg('wikibok-create-user','title'));
											$('#'+w).find('.user').focus();
										}
									}
								);
							}
						}
					},{
						text : $.wikibok.wfMsg('common','button_close','text'),
						title: $.wikibok.wfMsg('common','button_close','title'),
						class: $.wikibok.wfMsg('common','button_close','class'),
						click: function() {
							$(this).dialog('close');
						}
					}],
					close : function(ev,ui) {
						$(this).find('input:text,input:password,input:checkbox,input:radio').each(function(){
							$(this).val('');
							$(this).removeAttr('checked');
						})
					}
				}
			);
		})
		.on('click','.description-view',function(e){
			var t = $.data(e.target,'id');
			
		});
	//非表示要素
	$('.hide').hide();
	//タイマ定義
	$.timer.setIntervalTime(1*60*1000);
	$.timer.add($.revision.sync);
	$.timer.start();
});
