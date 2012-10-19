/*******************************************************************************
 * DescriptionEditor用Javascript
 *******************************************************************************/
jQuery(function($) {
	var
		mode = 'normal',
		svg = $('#result').description({
			gravity : 0.1,
			linkDistance : 60,
			charge : -300,
			ndoeFunc : function(d) {
				return true;
			},
			emptyFunc : function(d) {
				return (($.wikibok.findDescriptionPage(d.name,false,true)).length < 1)
			},
			textClick : textClick,
		});
	$.when(
		$.wikibok.loadDescriptionPages(),
		$.wikibok.requestCGI(
			'WikiBokJs::getDescriptionJson',
			[],
			function(dat,stat,xhr) {
					$.timer.add($.revision.allsync,true);
				return true;
			},
			function(xhr,stat,err) {
				return false;
			}
		)
	)
	.done(function(func1,func2) {
		var
			descjson = func2[0];
			svg.xmlconvert(descjson.basexml,{nclass:'bok',eclass:'bok',linkName:''});
			svg.xmlconvert(descjson.userxml,{nclass:'prebok',eclass:'prebok',linkName:''});
			svg.linkconvert(descjson.smwlink,{nclass:'desc',eclass:'smw'});
			desc = $.each($.wikibok.allDescriptionPage(),function(d,k){
				svg.addDescription(d,'desc');
			});
		$.wikibok.loadDescriptionPages()
		.done(function() {
			svg.load()
			//定期更新の予約(記事情報取得)
			$.timer.add(function() {
				$.wikibok.loadDescriptionPages()
				.done(function(){
					svg.update();
				});
			},false);
		})
		.always(function(){
			var
				h = $.wikibok.getUrlVars('#') || $.wikibok.wfMsg('defaultFocus') || '',
				count = 0;
			//ハッシュタグまたはデフォルト値を強調
			if(h != undefined && h != '') {
				$.Deferred(function(def) {
					if($('g[data="'+h+'"]').length > 0) {
						def.resolve();
					}
					else if( count > 5) {
						def.reject();
					}
					else {
						count++;
						setTimeout(arguments.callee.call({},def),1000);
					}
				})
				.done(function() {
					var
						time = 100,
						opt = {offset:{top:-150,left:-150}};
					$.Deferred(function(def) {
						svg.actNode(h);
						WINDOW_APP.util.scrollMonitor.add(function(p) {
							if(p.status == 0) {
								WINDOW_APP.util.scrollMonitor.remove(arguments.callee);
								$.scrollTo($('g[data="'+h+'"]'),time,opt);
							}
						});
						def.resolve();
					})
					.done(function(){
						setTimeout(function() {
							$.scrollTo($('g[data="'+h+'"]'),time,opt);
						},1000);
					});
				})
				.fail(function() {
					$(window).scrollTo('50%');
				});
			}
			else {
				$(window).scrollTo('50%');
			}
		});
	});
	$('#wikibok-search')
		//位置固定/アイコン化
		.setPosition({position : 'lb'},true)
		//検索用イベント定義
		.setSearch(svg,{
			find : '.commit',
			next : '.down',
			prev : '.up',
			list : '.list',
			text : '.text'
		});

	/**
	 * ノード名称部分のクリックイベント
	 *  - コンテキストメニュー呼出し
	 */
	function textClick(d) {
		var
			tmp = '<dl class="content"><dt>'+$.wikibok.wfMsg('wikibok-contextmenu','itemgroup','view')+'</dt>'
					+ '<dd class="command description-view">'+$.wikibok.wfMsg('wikibok-contextmenu','description','view')+'</dd>'
					+ ((wgEdit || wgDelete) ? '<dt class="content">'+$.wikibok.wfMsg('wikibok-contextmenu','itemgroup','edit')+'</dt>' : '')
					+ ((wgEdit && (d.type!='desc')) ? '<dd class="command description-add">'+$.wikibok.wfMsg('wikibok-contextmenu','bok','node-create')+'</dd>' : '')
					+ ((wgEdit)   ? '<dd class="command description-create">'+$.wikibok.wfMsg('wikibok-contextmenu','description','addnode')+'</dd>' : '')
					+ ((wgEdit)   ? '<dd class="command description-rename">'+$.wikibok.wfMsg('wikibok-contextmenu','description','rename')+'</dd>' : '')
					+ ((wgDelete) ? '<dd class="command description-delete">'+$.wikibok.wfMsg('wikibok-contextmenu','description','delete')+'</dd>' : '')
					+ '</dl>';
			_open = true,
			_def = true,
			tid = d.name,
			message = false;
		switch(mode) {
			case 'addSelect':
				if(tid == pid.name) {
					message = '親ノードとして選択済み';
				}
				else if(rid[tid] == undefined) {
					//BOK-XMLへ追加していないもののみ許可
					if(d.type == 'desc') {
						rid[tid] = {};
					}
					else {
						message = 'ノードとして追加済み';
					}
				}
				else {
					message = '追加ノードとして選択済み';
				}
				if(message !== false) {
					$.wikibok.timePopup(
						'BOK登録'+' '+$.wikibok.wfMsg('common','error'),
						message,
						5000
					);
				}
				break;
			case 'normal':
			default:
				$.wikibok.exDialog(
					$.wikibok.wfMsg('wikibok-contextmenu','title'),
					tmp,
					{
						create : function() {
							var
								me = $(this);
							me.on('click','.command',function(){me.dialog('close');})
								.on('click','.description-view',function(a,b) {
									var
										_title = tid;
									$.wikibok.getDescriptionPage(_title)
									.done(function(dat) {
										var
											page = dat.parse,
											ptxt = $(page.text['*']),
											desc = (ptxt.html() == null) ? $('<div>'+$.wikibok.wfMsg('wikibok-description','empty')+'</div>') : ptxt;
											//リンクを別タブ(ウィンドウ)で開く
											desc.find('a').attr({target:'_blank'});
										$.wikibok.viewDescriptionDialog(_title,desc)
										.done(function(){
											//Description側では下記の処理は必ずいる...?
											//最新のSMWリンク情報を取得(BOK-XML情報を取得していない...)
											$.wikibok.requestCGI(
												'WikiBokJs::getSMWLinks',
												[_title],
												function(dat,stat,xhr) {
													//リンクデータの削除は共通で実施
													$.each(svg.links({node:_title,type:'smw'}),function(i,d) {
														//リンクデータの削除
														svg.deleteLink(d.source,d.target,d.linkName);
													});
													//削除状態で一度データ更新
													svg.update();
													return (dat.res);
												},
												function(xhr,stat,err) {
												},
												false
											)
											.done(function(dat,stat,xhr) {
												//新しいリンクデータを作成(nclassの値をBOK-XMLと同期させる?)
												svg.linkconvert(dat.data,{nclass:'desc',eclass:'smw'});
												svg.update();
											});
										});
									})
									.fail(function() {
										var
											_t = $.wikibok.getPageNamespace(tid)+':'+$.wikibok.getPageName(tid);
										//記事がないので直接編集画面を開く
										$.wikibok.getDescriptionEdit(_t)
										.done(function(dat) {
											var
												page = dat.query.pages,
												token = $.map(page,function(d) {return d.edittoken;}).join(),
												timestamp = $.map(page,function(d) {return d.starttimestamp;}).join();
											//編集結果をAPIで反映してから,BOK-XMLへ反映する/しない
											$.wikibok.editDescriptionDialog(_t,'',{
												title : _t,
												token : token,
												basetimestamp : timestamp,
												createonly : true,
											})
											.done(function(res) {
												if(res) {
													//SVGデータ更新
												}
											});
										});
									});
								})
								.on('click','.description-add',function(a,b) {
									mode = 'addSelect';
									
								})
								.on('click','.description-create',function(a,b) {
									alert($(this).attr('class'));
								})
								.on('click','.description-rename',function(a,b) {
									alert($(this).attr('class'));
								})
								.on('click','.description-delete',function(a,b) {
									alert($(this).attr('class'));
								});
						},
						focus : function() {
							if(_open) {
								_open = false;
								$(this).html(tmp);
							}
						},
					}
				);
				break;
		}
	}
});
