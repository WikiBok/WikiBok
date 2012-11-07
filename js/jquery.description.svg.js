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
			target = 'g[data="'+_id+'"]',
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
		if(draw == true) {
			//紐付描画
			path.selectAll('path')
				.attr('d',function(d) {
					var
						dx = (d.target.x - d.source.x),
						dy = (d.target.y - d.source.y),
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
	}
	/**
	 *
	 */
	function update() {
		var
			addDesc,addPath,
			tranPath,
			_desc;
		//マーカの色分け設定(形はすべて同じ)
		def
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
	//データ定義
		descs = vis
			.selectAll('g.node')
			.data(aryNodes(),function(d){return d.id || (d.id = ++i);});
		path = vis
			.selectAll('g.edge')
			.data(_links(),function(d){return d.target.id});
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
		tranPath = path.transition();
		tranPath
			.selectAll('path')
			.attr('marker-end',function(d){return 'url(#'+d.type+')';});
		tranPath
			.selectAll('text')
			.text(function(d){return d.linkName;});
		path.exit().remove();
	//記事要素
		//新規
		addDesc = descs.enter()
			.append('svg:g')
			.attr('data',function(d){return d.name;})
			.classed('node',true);

		addDesc.append('svg:circle')
			.attr('r',6)
			//テキスト要素の表示/非表示切り替え(Mouseoverによるトグル動作)
			.on('mouseover.orig',function(d){
				if(d.visible == undefined) {
					d.visible = false;
				}
				$('g[data="'+d.name+'"]').find('g').toggle(d.visible);
			})
			.on('mouseout.orig',function(d) {
				d.visible = (d.visible == undefined) || (!d.visible);
			});
		_desc = addDesc.append('svg:g')
			.on('click.add',options.textClick)
			.on('click.orig',function(d){
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
		descs.transition()
			.selectAll('text')
			.text(function(d){return d.name;});
		//削除
		descs.exit().remove();
		//クラス設定
		vis.selectAll('g.node')
			.classed('desc',function(d){return (d.type == 'desc');})
			.classed('prebok',function(d){return (d.type == 'prebok');})
			.classed('bok',function(d){return (d.type == 'bok');})
			.classed('empty',options.emptyFunc);
		//ドラッグイベントの追加
		descs.call(advDrag);
		tick();
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
							addDescription(pn,{type:xmlopt.nclass}),
							addDescription(cn,{type:xmlopt.nclass}),
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
				addDescription(o.source,{type:linkopt.nclass}),
				addDescription(o.target,{type:linkopt.nclass}),
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
//		return nodes[a] || (nodes[a] = (arguments.length < 3) ? {name : a,type :b} : $.extend({},c,{name:a,type:b}));
		var
			node = nodes[a] || (nodes[a] = {name : a}),
			c = (arguments < 2) ? {} : b;
		return $.extend(node,c);



	}
	/**
	 * 関係付けデータ追加
	 * @param a リンク元ノード(名称ではない)
	 * @param b リンク先ノード(名称ではない)
	 * @param c リンクタイプ(SMWなど)
	 * @param d リンク名称
	 */
	function addLink(a,b,c,d) {
		var
			_link = {
				source : a,
				target : b,
				type : (arguments.length < 3) ? '' : c || '',
				linkName : (arguments.length < 4) ? '' : d || '',
			};
		//まったく同じリンクがある場合は追加しない...
		if(a.name != '' && b.name != '' && linkcount(_link) < 1) {
			links.push(_link);
		}
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
	/**
	 * 関連付けデータ削除
	 * @param a リンク元ノード(名称ではない)
	 * @param b リンク先ノード(名称ではない)
	 * @param c リンク名称
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
				source : null,
				target : null,
				node : null,
				type : null
			},filter);
		return (arguments.length < 1 || filter == undefined) ? links :
			links.filter(function(d) {
				var
					res = true;
				if(filtOpt.linkName != null && res) {
					if($.isArray(filtOpt.linkName)) {
						res = (filtOpt.linkName.filter(function(e){return (e == d.linkName)}).length > 0);
					}
					else {
						res = (filtOpt.linkName == d.linkName);
					}
				}
				if(filtOpt.source != null && res) {
					if($.isArray(filtOpt.node)) {
						res = (filtOpt.source.filter(function(e){return (e == d.source.name);}).length > 0);
					}
					else {
						res = (filtOpt.source == d.source.name);
					}
				}
				if(filtOpt.target != null && res) {
					if($.isArray(filtOpt.node)) {
						res = (filtOpt.target.filter(function(e){return (e == d.target.name);}).length > 0);
					}
					else {
						res = (filtOpt.target == d.target.name);
					}
				}
				if(filtOpt.node != null && res) {
					if($.isArray(filtOpt.node)) {
						res = (filtOpt.node.filter(function(e){return ((e == d.source.name) || (e == d.target.name));}).length > 0);
					}
					else {
						res = (filtOpt.node == d.source.name || filtOpt.node == d.target.name);
					}
				}
				if(filtOpt.type != null && res) {
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
	 * キャンパスサイズ設定
	 */
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
	/**
	 * 全ノードデータの取得
	 */
	function allNode() {
		return $.map(nodes,function(d){
			if(typeof d.name =='string' && d.name.length > 0) {
				return d;
			}
		});
	}
	/**
	 * ノードの名前を変更する
	 * @param 変更前の名前
	 * @param 変更後の名前
	 */
	function renameNode(a,b) {
		var
			node,
			fnode,
			tnode,
			flink = _links({node:a});
		if(nodes[a] != undefined) {
			if(nodes[b] == undefined) {
				node = nodes[a];
				//旧データを削除
				delete nodes[a];
				for(var i=0;i < flink.length;i++) {
					deleteLink(flink[i].source,flink[i].target,flink[i].linkName);
				}
				update();
				//新データを設定
				fnode = addDescription(a,{type:'desc'});
				tnode = addDescription(a,{name:b,type:node.type});
				for(var i=0;i < flink.length;i++) {
					addLink(
						(flink[i].source == node) ? tnode : flink[i].source,
						(flink[i].target == node) ? tnode : flink[i].target,
						flink[i].type,
						flink[i].linkName
					);
				}
				return true
			}
		}
		return false;
	}

	/**
	 * 対象ノードを強調
	 * @param a 対象ノード名称
	 * @param b 強調設定用クラス名称
	 */
	function actNode(a,b) {
		var
			_class = (arguments.length < 2 || b == undefined) ? 'active' : b;
		clearClassed(_class);
		classed(a,_class);
	}
	var
		//ドラッグ設定
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
				force.resume();
				tick();
			}),
		i=0,
		force,
		svg,
		vis,
		def,
		links = [],
		nodes = {},
		aryNodes = function(){
			return $.map(d3.values(nodes),function(d){
				if(typeof d.name =='string' && d.name.length > 0) {
					d.x = (d.x == undefined) ? 0 : d.x;
					d.y = (d.y == undefined) ? 0 : d.y;
					d.px = d.x;
					d.py = d.y;
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
			nodeFunc  : function() {},
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
					.charge(options.charge)
					.start();
				def = svg.append('defs').selectAll('maker');
				setSize();
				for(var i=0;i<100;i++) {
					force.tick();
				}
				draw = true;
				update();
				force.stop();
				//クリックで描画更新を停止
				$('#BokXml').on('click',function() {
					update();
					force.stop();
				});
			},
			update : function(a){
				force
					.nodes(aryNodes())
					.links(links)
					.start();
				//描画更新なので、DOM要素の更新と
				update();
				if(a) {
					//描画位置の再計算を行う
					force.resume();
				}
				force.stop();
			},
			stop : function() {
				force.stop();
			},
			classed : classed,
			clearClassed : clearClassed,
			xmlconvert : xmlconvert,
			linkconvert: linkconvert,
			addDescription : addDescription,
			delDescription : function(d) {
				if(d in nodes) {
					//BOKへ追加していない・記事内容なし
					if(nodes[d].type == 'desc' && options.emptyFunc(nodes[d])) {
						delete nodes[d];
					}
				}
			},
			links : _links,
			actNode : actNode,
			allNode : allNode,
			addLink : addLink,
			deleteLink : deleteLink,
			renameNode : renameNode,
			fixclear : function() {
				$.each(nodes,function(i,d) {
					d.fixed = false;
				});
			}
		};
	$.fn.extend({
		description : DescriptionEditor.init,
	});
})(jQuery);
