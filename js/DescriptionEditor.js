/*******************************************************************************
 * DescriptionEditor用Javascript
 *******************************************************************************/
jQuery(function($) {
	var
		svg = $('#result').description({
			gravity : 0.1,
			linkDistance : 60,
			charge : -300,
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
					$.timer.start();
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
			svg.xmlconvert(descjson.userxml,{nclass:'bok',eclass:'bok',linkName:''});
			svg.xmlconvert(descjson.basexml,{nclass:'prebok',eclass:'prebok',linkName:''});
			svg.linkconvert(descjson.smwlink,{nclass:'desc',eclass:'smw'});
			desc = $.each($.wikibok.allDescriptionPage(),function(d,k){
				svg.addDescription(d,'desc');
			});
			svg.load();
			//定期更新の予約(記事情報取得)
			$.timer.add(svg.update,true);
			$.timer.add($.wikibok.loadDescriptionPages);
			//ハッシュタグまたはデフォルト値を強調
			var h = $.wikibok.getUrlVars('#') || $.wikibok.wfMsg('defaultFocus');
			if(h != undefined && h != '') {
				var aNode = $('g[data="'+h+'"]');
				if(aNode.length < 1) {
					$(window).scrollTo('50%');
				}
				else {
					svg.actNode(h);
					$.scrollTo(aNode);
				}
			}
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

	function textClick(d) {
		var
			tid = d.name,
			tmp = '<dl class="content"><dt>'+$.wikibok.wfMsg('wikibok-contextmenu','itemgroup','view')+'</dt>'
					+ '<dd class="command description-view">'+$.wikibok.wfMsg('wikibok-contextmenu','description','view')+'</dd>';
		//編集権限確認
		if(wgLogin && wgEdit) {
			tmp = tmp
					+ '<dt>'+$.wikibok.wfMsg('wikibok-contextmenu','itemgroup','edit')+'</dt>'
					+ '<dd class="command description-create">'+$.wikibok.wfMsg('wikibok-contextmenu','description','addnode')+'</dd>'
		}
		//削除権限確認
		if(wgLogin && wgEdit) {
			tmp = tmp
					+ '<dt>'+$.wikibok.wfMsg('wikibok-contextmenu','itemgroup','special')+'</dt>'
					+ '<dd class="command description-delete">'+$.wikibok.wfMsg('wikibok-contextmenu','description','delete')+'</dd>';
		}
		tmp = tmp+'</dl>';
		$.wikibok.exDialog(
			$.wikibok.wfMsg('wikibok-contextmenu','title'),
			'',
			{
				open : function() {
					var
						dialog = this;
					$(dialog).html(tmp);
					$(dialog)
						.on('click','.description-view',function(a,b){
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
									//最新のSMWリンク情報を取得(BOK-XML情報を取得していない...)
									$.wikibok.requestCGI(
										'WikiBokJs::getSMWLinks',
										[_title],
										function(dat,stat,xhr) {
											return (dat.res);
										},
										function(xhr,stat,err) {
										},
										false
									)
									.done(function(dat,stat,xhr) {
										//リンクの本数が変更にならないと表示更新がうまくいかないので、削除・作成でそれぞれ更新する
										$.each(svg.links({node:_title}),function(i,d) {
											//リンクデータの削除
											svg.deleteLink(d.source,d.target,d.linkName);
										});
										svg.update();
										//リンクデータの作成(nclassの値をBOK-XMLと同期させる?)
										svg.linkconvert(dat.data,{nclass:'desc',eclass:'smw'});
										svg.update();
									});
								});
							})
							.fail(function() {
								alert('記事がない...');
							});
						})
						.on('click','.description-create',function(a,b) {
						})
						.on('click','.description-delete',function(a,b) {
						})
						.on('click','.command',function(a,b) {
							$(dialog).off('click');
							$(dialog).dialog('close');
						});
				}
			}
		);
	}
});
