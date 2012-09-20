/**
 * DescriptionEditor描画用Javascript関数群
 *	- (d3.v2.jsを利用)
 */
(function($) {
	/**
	 * 描画設定
	 */
	function  makeCanvas() {
		svg = d3.select(this.get(0)).append('svg:svg').attr('id','BokXml');
		vis = svg.append('svg:g')
			.attr('transform','translate(10,10)');
		//クリックで描画更新を停止
		$('#BokXml').on('click',function() {
			//何も書かれていない場合を考慮して、一度描画計算処理をする
			draw = true;
			force.tick();
			force.stop();
		});
	}
	/**
	 * 対象の[svg:g]ノードにCSS-Classを追加/削除する
	 * @param a 対象ノード名称
	 * @param b 設定CSS名称
	 * @param c true(追加)/false(削除)
	 */
	function classed(a,b,c) {
		var
			_id = (typeof a == 'string') ? a : a.name,
			target = '',
			cls = (arguments.length < 2) ? 'active' : b,
			flg = (arguments.length < 3) ? true : c;
		//対象ノードのみ選択済み[active]クラスを追加
		d3.selectAll(target).classed(cls,flg);
	}
	/**
	 * 指定したクラスをすべてのノードから削除する
	 * @param cls  クラス名称
	 * @param node 対象ノード[省略時:g(ノード全体)]
	 */
	function clearClassed(cls,node) {
		var n = (arguments.length < 2) ? 'g' : node
		d3.selectAll(n).classed(cls,false);
	}
	/**
	 * レイアウト位置算出1回ごとのイベント処理
	 */
	function tick(ev) {
		if(draw == false) {
			draw = (ev.alpha < 0.04);
			return;
		}
		//紐付描画
		path.selectAll('path')
			.attr('d',function(d) {
				var
					dx = d.target.x - d.source.x,
					dy = d.target.y - d.source.y,
					dr = Math.sqrt(dx * dx + dy * dy);
				return 'M'+d.source.x+','+d.source.y+' '+d.target.x+','+d.target.y;
			});
		path.selectAll('text')
			.attr('x',function(d) {return d.target.x - ((d.target.x - d.source.x) / 2);})
			.attr('y',function(d) {return d.target.y - ((d.target.y - d.source.y) / 2);});
		//記事○位置
		descs
			.attr('transform',function(d){
				return 'translate('+d.x+','+d.y+')';
			});
	}
	/**
	 *
	 */
	function update() {
		var
			addDesc,addPath,
			_circle,
			_desc;
	//データ定義
		descs = vis
			.selectAll('g.node')
			.data(aryNodes());
		path = vis
			.selectAll('g.edge')
			.data(_links());
	//関連付け要素
		addPath = path.enter()
			.append('svg:g')
			.attr('class',function(d){return d.type+' '+d.linkName;})
			.classed('edge',true);
		addPath
			.append('svg:path')
			.attr('marker-end',function(d){return 'url(#'+d.type+')';});
		addPath
			.append('svg:text')
			.text(function(d){return d.linkName;})
			.classed('shadow',true);
		addPath
			.append('svg:text')
			.text(function(d){return d.linkName;});
		path.transition();
		path.exit().remove();
	//記事要素
		//新規
		addDesc = descs.enter()
			.append('svg:g')
			.attr('data',function(d){return d.name;})
			.attr('class',function(d){return d.type;})
			.classed('empty',options.emptyFunc)
			.classed('node',true);
		addDesc.append('svg:circle')
			.attr('r',6);
		_desc = addDesc.append('svg:g')
			.on('click.add',options.textClick)
			.on('click.orig',function(){
				force.stop();
				event.preventDefault();
				return false;
			});
		_desc.append('svg:text')
			.attr('x',8)
			.attr('y','.31em')
			.classed('shadow',true)
			.text(function(d){return d.name;});
		_desc.append('svg:text')
			.attr('x',8)
			.attr('y','.31em')
			.text(function(d){return d.name;});
		//変更
		descs.transition();
		//削除
		descs.exit().remove();
		//ドラッグイベントの追加
		descs.call(advDrag);
	}
	/**
	 * BOK-XML形式のデータをDescriptionEditor用リンク形式に変換
	 *   - 既存の記事/リンク要素に解析結果を追加[データの置き換えではない]
	 * @param xml 解析対象のBOK-XMLデータ
	 * @param opt 解析結果のデータに使用するクラス/リンク名称の設定[省略可]
	 */
	function xmlconvert(xml,opt) {
		//BOK-XML内の階層データを再帰処理する関数
		function _convert() {
			var
				me = $(this);
			$.each(me,function(i,o) {
				var
					pn = $(o).find('>name').text(),
					c = $(o).find('>nodes'),
					cc = $(c).find('>node');
				if(c.length > 0) {
					//各子ノードへ対してリンクデータ(及び記事情報)作成
					$.each(cc,function(i,m) {
						var
							cn = $(m).find('>name').text();
						addLink(
							addDescription(pn,xmlopt.nclass),
							addDescription(cn,xmlopt.nclass),
							xmlopt.eclass,
							xmlopt.linkName
						);
					});
					//各子ノードについて再帰処理
					_convert.call(cc);
				}
			});
		}
		var
			xmlopt = $.extend({},{
				nclass : 'bok',
				eclass : 'bok',
				linkName : 'bok'
			},opt);
		_convert.call($(xml))
		return;
	}
	/**
	 * SMWリンクデータを記事情報込みのデータに更新
	 * @param dat サーバから取得したデータ
	 * @param opt データに使用するクラス/リンク名称の設定[省略可]
	 */
	function linkconvert(dat,opt){
		var
			linkopt = $.extend({},{
				nclass : 'desc',
				eclass : 'smw',
				linkName : 'smw'
			},opt);
		//名称から記事情報へ変更する
		$.each(dat,function(i,o) {
			addLink(
				addDescription(o.source,linkopt.nclass),
				addDescription(o.target,linkopt.nclass),
				linkopt.eclass,
				o.linkName || linkopt.linkName
			);
		});
		return;
	}
	/**
	 * 記事データ参照/追加
	 */
	function addDescription(a,b) {
		return nodes[a] || (nodes[a] = {name : a,type :b});
	}
	/**
	 * 関係付けデータ追加
	 */
	function addLink(a,b,c,d) {
		var
			_link = {
				source : a,
				target : b,
				type : (arguments.length < 3) ? '' : c || '',
				linkName : (arguments.length < 4) ? '' : d || '',
			};
		if(a.name != '' && b.name != '' && linkcount(_link) < 1) {
			links.push(_link);
		}
	}
	/**
	 * 関連付けデータ削除
	 */
	function deleteLink(a,b,c) {
		var
			t = (arguments.length < 3) ? true : false,
			newlinks = links.filter(function(d) {
				return !((t) ? ((d.source == a) && (d.target == b)) : ((d.source == a) && (d.target == b) && (d.linkName == c)));
			});
		links = newlinks;
	}
	/**
	 * 関連付け情報取得/条件指定可
	 * @param filter ハッシュ情報[省略可/それぞれ配列形式で複数指定可] {
	 *   linkName : 関連付け名称を指定
	 *   node : 記事名称を指定
	 *   type : 関連付け種別を指定
	 * }
	 */
	function _links(filter) {
		var filtOpt = $.extend({},{
				linkName : null,
				node : null,
				type : null
			},filter);
		return (arguments.length < 1 || filter == undefined) ? links :
			links.filter(function(d) {
				var
					res = true;
				if(filtOpt.linkName != null) {
					if($.isArray(filtOpt.linkName)) {
						res = (filtOpt.linkName.filter(function(e){return (e == d.linkName)}).length > 0);
					}
					else {
						res = (filtOpt.linkName == d.linkName);
					}
				}
				if(filtOpt.node != null) {
					if($.isArray(filtOpt.node)) {
						res = (filtOpt.node.filter(function(e){return ((e == d.source.name) || (e == d.target.name));}).length > 0);
					}
					else {
						res = (e == d.source.name || e == d.target.name);
					}
				}
				if(filtOpt.type != null) {
					if($.isArray(filtOpt.type)) {
						res = (filtOpt.type.filter(function(e){return (e == d.type)}).length > 0);
					}
					else {
						res = (filtOpt.type == d.type);
					}
				}
				return res;
			});
	}
	/**
	 * 関連付け情報排他チェック
	 * @param a 関連付け情報
	 */
	function linkcount(a) {
		return (links.filter(function(d) {
			return (d.source == a.source && d.target == a.target && d.linkName == a.linkName);
		}).length)
	}
	function setSize() {
		var
			_min = 1440,
			_max = 14400,
			_calc = (aryNodes().length - 1) * options.linkDistance,
			_size = (_calc < _min) ? _min : ((_max < _calc) ? _max : _calc);
		svg
			.attr('width',_size)
			.attr('height',_size)
			.attr('viewBox','0 0 '+parseInt(_size)+' '+parseInt(_size));
		force.size([_size,_size]);
	}
	var
		advDrag = d3.behavior.drag()
			.on('dragstart',function(d,i) {
				force.stop();
			})
			.on('drag',function(d,i) {
				d.px += d3.event.dx;
				d.py += d3.event.dy;
				d.x += d3.event.dx;
				d.y += d3.event.dy; 
				tick();
			})
			.on('dragend',function(d,i) {
				d.fixed = true;
				tick();
				force.resume();
			}),
		force,
		svg,
		vis,
		def,
		links = [],
		nodes = {},
		aryNodes = function(){
			return $.map(d3.values(nodes),function(d){
				if(typeof d.name =='string' && d.name.length > 0) {
					return d;
				}
			});
		},
		descs,
		path,
		draw = false,
		options = {
			gravity : 0.1,
			linkDistance : 60,
			charge : -300,
			emptyFunc : function() {},
			textClick : function() {},
		},
		DescriptionEditor = {
			init : function(option) {
				options = $.extend({},options,option);
				makeCanvas.call(this);
				return DescriptionEditor;
			},
			load : function() {
				//レイアウトにデータ・オプションを設定
				force = d3.layout.force()
					.on('tick',tick)
					.nodes(aryNodes())
					.links(links)
					.gravity(options.gravity)
					.linkDistance(options.linkDistance)
					.charge(options.charge);
				//マーカの色分け設定(形はすべて同じ)
				def = svg.append('defs').selectAll('maker')
					.data($.unique($.map(links,function(d){return d.type;})))
					.enter()
						.append('marker')
						.attr('id', String)
						.attr('viewBox', '0 0 5 5')
						.attr('refX', 10)
						.attr('refY', 2.5)
						.attr('markerWidth', 5)
						.attr('markerHeight', 5)
						.attr('orient', 'auto')
						.append('path')
						.attr('d', 'M0,0L0,5L5,2.5L0,0');
				setSize();
				update();
				force.start();
			},
			update : update,
			classed : classed,
			clearClassed : clearClassed,
			xmlconvert : xmlconvert,
			linkconvert: linkconvert,
			addDescription : addDescription,
			links : _links,
		};
	$.fn.extend({
		description : DescriptionEditor.init,
	});
})(jQuery);
