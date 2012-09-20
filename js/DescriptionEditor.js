/*******************************************************************************
 * DescriptionEditor用Javascript
 *******************************************************************************/
jQuery(function($) {
	var
		dElem = $('body').get(0),
		svg = $('#result').description({
			gravity : 0.1,
			linkDistance : 60,
			charge : -300,
			emptyFunc : function(d) {
				return (($.wikibok.findDescriptionPage(d.name,false,true)).length < 1)
			},
			textClick : function(d) {
				alert(d.name);
			},
		});
	$.when(
		$.wikibok.loadDescriptionPages(),
		$.wikibok.requestCGI(
			'WikiBokJs::getDescriptionJson',
			[],
			function(dat,stat,xhr) {
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
				svg.addDescription(k,'desc');
			});
			svg.load();
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

});
