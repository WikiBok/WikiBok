/*******************************************************************************
 * DescriptionEditor用Javascript
 *******************************************************************************/
jQuery(function($) {
	WIKIBOK_APP.util.revision.init($('#rev'));
	//キャンパスの設定
	var contextSetting = {
			width : $.wikibok.wfMsg('wikibok-contextmenu','description','width'),
			height : $.wikibok.wfMsg('wikibok-contextmenu','description','height'),
			buttons : [{
				text : $.wikibok.wfMsg('common','button_close','text'),
				title : $.wikibok.wfMsg('common','button_close','title'),
				class : $.wikibok.wfMsg('common','button_close','class'),
				click : function() {
					$(this).dialog('close');
				}
			}]
		},
		cont = {
			bok : '',
			preBok : '',
			desc : '<dt>'+$.wikibok.wfMsg('wikibok-contextmenu','itemgroup','edit')+'</dt>'
				 + '<dd class="command wikibok-description-addnode" onclick="">'+$.wikibok.wfMsg('wikibok-contextmenu','description','add')+'</dd>'
				 + '<dd class="command wikibok-description-searchsmw" onclick="">'+$.wikibok.wfMsg('wikibok-contextmenu','description','searchsmw')+'</dd>'
		},
		scrollSet = {
			offset:{
				left:(-1/2*$(window).width()),
				top:(-1/2*$(window).height())
			}
		},
		svg = $('#result').description({
			nodeClick : function(a,b) {
				var	temp = '<dl class="context">'
						 + '<dt>'+$.wikibok.wfMsg('wikibok-contextmenu','itemgroup','view')+'</dt>'
						 + '<dd class="command wikibok-descriptioneditor-view-element" onclick="">'+$.wikibok.wfMsg('wikibok-contextmenu','description','view')+'</dd>';
				if(wgEdit) {
					//未ログインの場合、編集メニューは不可
					temp +=	cont[a.type]
				}
				temp += '</dl>';
				var me = $.wikibok.exDialog(
						$.wikibok.wfMsg('wikibok-contextmenu','title'),
						temp,
						contextSetting
					);
				$('dl > .command',me).each(function() {
					//ダイアログを閉じる
					$(this).bind('click',function() {
						$(me).dialog('close');
						//処理対象のノード名称を設定
						$.data(this,'id',a.name)
					});
				});
			},
			links : [
				{key : 'headlink',type : 'bok' ,ltype : 'bok'},
				//リンクもコミット前の色を作成...
				{key : 'boklink',type : 'preBok' ,ltype : 'preBok'},
				{key : 'smwlink',type : 'desc',ltype : 'smw'}
			],
			edgeClick : function(a,b) {},
			//初期出力時に表示するElementID
			// -- 描画しない場合には、本設定を行わないとBrowserが停止しているように見えるため注意が必要
			loading_element : '#wikibok-loading',
			//初回出力時に描画処理を指定回数で一時停止する
			// -- (0以下または527以上を設定した場合は、必ず収束まで終了しない)
			first_tick_count : 100,
			//初期出力時に描画処理を行う[TRUE]/行わない[FALSE]の設定
			// -- 描画をしないほうが若干だが処理時間を短縮できる
			first_draw : false
		}),
		_search;
	//BOKへ追加
	$('.wikibok-description-addnode').live('click',function(){
		var	cNode = $.data(this,'id');
		$.requestWikiBokCGI(
			'WikiBokJs::createNodeRequest',
			[cNode],
			function(res) {
				if(res.res == false) {
					var eBox = $.wikibok.exDialog(
							res.t,
							res.b,
							{
								width : res.w,
								height: res.h,
								buttons : [{
									text : res.y,
									class : 'close',
									click : function() {
										$(eBox).dialog('close');
									}
								}]
							}
						);
				}
				else {
					//クラスを変更(色を追加済みにする)
					svg.changeClass(cNode,'preBok');
					WIKIBOK_APP.util.revision.set(res.res);
				}
			}
		);
	});
	//記事追加用Dialog呼び出し
	$('.new','#wikibok-edit').live('click',function(){
		if(!wgEdit) return true;
		var	_tmp = $('<dl/>'),
			_itemData = $('<dt/><dd><input type="text" name="name"/></dd>'),
			_input = _itemData.find('input'),
			_viewID = $.wikibok.uniqueID('Description','view'),
			_view = $($.getSelecter(_viewID,'#'));
		//記事内容表示領域が未作成の場合、追加する
		if(_view.length < 1) {
			$('<div/>').attr('id',_viewID).appendTo('body');
			_view = $($.getSelecter(_viewID,'#'));
		}
		//表示文言設定
		_itemData.filter('dt').html($.wikibok.wfMsg('wikibok-new-element','description','headline'));
		//入力エリア動作設定(入力補完)
		_input.addClass('name')
		.bind('autocompleteclose',function() {
		//選択終了時に記事内容表示をやめる
			_view.remove();
		})
		.autocomplete({
			position : {
				my : 'left bottom',
				at : 'right top'
			},
			create : function(e,u) {
				//作成時にデータを取得
				$.requestWikiBokCGI(
					'WikiBokJs::getDescriptionList',
					undefined,
					function(res){
					//データを要素に紐付
						$.data(_input.get(0),'suggest',res);
					},
					function() {}
				);
			},
			//入力によってデータを限定
			source : function(req,res) {
				var nodes = $.data(_input.get(0),'suggest');
				//通信が終了していない場合など、何もせずに戻る
				if(nodes == undefined) return;
				nodes = nodes.filter(function(d) {
					//限定条件は入力内容をどこかに含むもの(正規表現)
					var re = new RegExp(req.term,'igm');
					return ((d.name != '') && (d.name.match(re)));
				});
				//取得データから名称のみを抽出し配列化
				res($.map(nodes,function(d){
					return {
						//表示/入力値となる
						label : d.name,
						value : d.name
					}
				}));
			},
			//各入力補完候補にフォーカスした場合の設定
			focus : function(a,b) {
				var t = b.item.label,
					v = b.item.value,
					list = _input.autocomplete('widget');
				//if(a.fromElement == a.toElement) return;
				//記事内容を初期化(問い合わせ中は記事を表示しない)
				_view.html('')
				.show()
				.css({
					'background-color' : '#CCF',
					width : '30%',
					height : '30%',
					padding : '0',
					'z-index' : function() {
						//記事内容を表示するエリアはダイアログより上に表示する
						var z = parseInt($(mBox).dialog('widget').css('z-index')) || $(mBox).dialog('option','zIndex');
						return z + 1;
					}()
				})
				.position({
					of : list,
					my : 'left top',
					at : 'left bottom',
					collision : 'flip'
				})
				//WikiAPIによる記事内容問い合わせ
				.getDescription(t,{
					success : function(d, dt) {
						var desc_text = d['parse']['text']['*'],
							desc_title = d['parse']['displaytitle'];
						_view.html(function(desc_text){
							//記事なしの場合、専用文言を表示
							return (desc_text == undefined || $(desc_text).html() == null)
							? $.wikibok.wfMsg('wikibok-description','listview','empty')
							: ($(desc_text).html() || desc_text);
						}(desc_text))
						.css({
							padding : '5px'
						});
					},
					//複数POSTを許可しない(後出し勝ち)
					// - RequestObjectを破棄しているだけなので、サーバ側の応答時間は増加する
					//   できれば、Request中はFocusEventをOFFしたい...(未対応)
					anyPost : false
				});
			}
		});
		_tmp.append(_itemData);
		
		var	mBox = $.wikibok.exDialog(
				$.wikibok.wfMsg('wikibok-new-element','title'),
				_tmp,
				{
					width : $.wikibok.wfMsg('wikibok-new-element','width'),
					height : ($.wikibok.wfMsg('wikibok-new-element','height') + $.wikibok.wfMsg('wikibok-new-element','itemheight') * (arguments.length)),
					open : function(ev,ui) {
						var d = $(this).dialog('widget');
						d.setInterruptKeydown([
							{class : 'name',next : 'commit', prev : 'close'}
						]);
					},
					buttons:[{
						//作成ボタン
						text : $.wikibok.wfMsg('wikibok-new-element','description','button','text'),
						title : $.wikibok.wfMsg('wikibok-new-element','description','button','title'),
						class : $.wikibok.wfMsg('wikibok-new-element','description','button','class'),
						click : function() {
							var cNode = $('.name',mBox).val(),
								pNode = n;
							if(cNode == undefined || cNode == '') {
							//未入力の場合、サーバ通信なしでエラーとする
								var eBox = $.wikibok.exDialog(
									$.wikibok.wfMsg('wikibok-new-element','title')+' '+$.wikibok.wfMsg('common','error'),
									$.wikibok.wfMsg('wikibok-new-element','error','empty'),
									{
										width : $.wikibok.wfMsg('wikibok-new-element','width'),
										height : $.wikibok.wfMsg('wikibok-new-element','height'),
										buttons : [{
											text : $.wikibok.wfMsg('common','button_ok','text'),
											title : $.wikibok.wfMsg('common','button_ok','title'),
											class : $.wikibok.wfMsg('common','button_ok','class'),
											click : function() {
												$(eBox).dialog('close');
											}
										}]
									}
								)
								//失敗しているので閉じない(処理続行)
								return;
							}
							//ページを仮作成
							$.createPage(cNode,{
								success : function(a,b) {
									//SVGデータ上に新規ノードデータを作成
									$.mySvg.addNode({name:cNode});
									$.mySvg.update();
									//記事入力ダイアログボックスを作成
									$.editDescription(
										cNode,
										function(res) {
											$.when(
												//WikiAPIで記事情報取得
												$.requestWikiAPI({
													action : 'query',
													gapfrom : cNode,
													generator : 'allpages',
													gapnamespace : wgNsDesc,
													prop : 'info',
													//ページサイズが0のものを空記事と判断
													gapminsize : 1,
													gaplimit : 1
												},function(r){
													if(r['query'] != undefined && r['query']['pages'] != undefined) {
														var pages = r['query']['pages'];
														for(var k in pages) {
															var page = pages[k];
																_name = $.getPageName(page.title),
																_NS = $.getPageNamespace(page.title);
															return (_name == cNode);
														}
													}
													else {
														return false;
													}
												},{
													error : function() {
														return false;
													}
												})
											)
											.then(function(res){
												//空記事情報の更新
												var	r = res[0],
													dat = $.data($('#wikibok-loading').get(0),'DescriptionPages');
												if(r['query'] != undefined && r['query']['pages'] != undefined) {
													var pages = r['query']['pages'];
													for(var k in pages) {
														var page = pages[k];
															_name = $.getPageName(page.title),
															_NS = $.getPageNamespace(page.title);
														dat[_name] = {
															name : _name,
															namespace : _NS
														};
													}
												}
												$.data($('#wikibok-loading').get(0),'DescriptionPages',dat);
												if(wgPageName.indexOf('Description') != -1) {
													//SMWリンクの反映
													$.requestWikiBokCGI(
														'WikiBokJs::getSMWLinks',
														[cNode],
														function(res) {
															//新規作成記事なのでリンク作成のみ実施
															if(res.res == true) {
																var	after = res.data;
																for(var i=0;i<after.length;i++) {
																	var item = after[i];
																	$.mySvg.addLink({
																		source:item.source,
																		target:item.target,
																		linkName:item.linkName
																	});
																}
															}
															$.mySvg.update(cNode);
														},
														function(res) {
															$.mySvg.update(cNode);
														},
														true
													);
												}
											})
											.fail(function(r) {
												var	dat = $.data($('#wikibok-loading').get(0),'DescriptionPages');
												delete dat[cNode];
												$.data($('#wikibok-loading').get(0),'DescriptionPages',dat);
												//DescriptionEditorの場合
												if(wgPageName.indexOf('Description') != -1) {
													var _all = d3.selectAll('#path path.smw').data()
																.filter(function(d) {
																	return (d.source.name == cNode);
																});
													//リンクがなしなので、すべて削除...
													for(var i=0;i<_all.length;i++) {
														var item = _all[i];
														$.mySvg.delLink({
															source:item.source.name,
															target:item.target.name,
															linkName:item.linkName
														});
													}
													$.mySvg.update(cNode);
												}
											});
										},
										{
											close : function() {
												$(mBox).dialog('close');
												$(this).remove();
											}
										}
									);
								},
								already : function() {
									var eBox = $.wikibok.exDialog(
										$.wikibok.wfMsg('wikibok-new-element','title')+' '+$.wikibok.wfMsg('common','error'),
										$.wikibok.wfMsg('wikibok-new-element','error','already'),
										{
											width : $.wikibok.wfMsg('wikibok-new-element','width'),
											height : $.wikibok.wfMsg('wikibok-new-element','height'),
											buttons : [{
												text : $.wikibok.wfMsg('common','button_ok','text'),
												title : $.wikibok.wfMsg('common','button_ok','title'),
												class : $.wikibok.wfMsg('common','button_ok','class'),
												click : function() {
													var aNode = $('*[data="'+cNode+'"]');
													$.wikibok.wfScroll(aNode,{});
													$(mBox).dialog('close');
													$(eBox).dialog('close');
												}
											}]
										}
									);
								},
								error : function() {
								}
							});
						}
					},{
						//閉じるボタン(作成キャンセル)
						text : $.wikibok.wfMsg('common','button_close','text'),
						title : $.wikibok.wfMsg('common','button_close','title'),
						class : $.wikibok.wfMsg('common','button_close','class'),
						click : function() {
							$(mBox).dialog('close');
						}
					}]
				}
			);
	});
	$('dd.wikibok-description-searchsmw').live('click',function(a,b) {
		
	});
	//データロード
	svg.load(0,wgUserName,function() {
		WIKIBOK_APP.util.revision.request();
		//ハッシュタグまたはデフォルト値を強調
		var	h = window.location.hash.slice(window.location.hash.indexOf('#') + 1) || $.wikibok.wfMsg('defaultFocus');
		if(h != undefined && h != '') {
			var aNode = $('*[data="'+h+'"]');
			if(aNode.length < 1) {
				$(window).scrollTo('50%');
			}
			else {
				$.wikibok.wfScroll(aNode,{
					after : function() {
						aNode.changeColor('#FF0000');
					}
				});
			}
		}
	});
	//別ファイル内の処理で作成したsvgオブジェクトを持ちまわるため、jQueryを拡張
	$.extend({mySvg : svg});
	WIKIBOK_APP.util.timer.setIntervalTime(1 * 60 * 1000);
	//リビジョン情報の更新
	WIKIBOK_APP.util.timer.add(function(){
		var r = WIKIBOK_APP.util.revision.get('user');
		WIKIBOK_APP.util.revision.request(r);
	});
	//空記事情報の取得(初期情報の取得はjquery.bok.svg.jsで実行済み[同期通信])
	WIKIBOK_APP.util.timer.add(function(){
		//更新時は非同期通信で情報を取得する
		$.getDescriptionPages({},{},{async:true});
	},false);
	WIKIBOK_APP.util.timer.start();


});
