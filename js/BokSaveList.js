jQuery(function($) {
	$('#list_result').tablesorter({
		widthFixed : true,
		widgets : ['zebra'],
		sortList : [[0,0]],
	})
	.tablesorterPager({
		container : '.wbs_list_result_pager',
		positionFixed : false,
		size : $(this).find('select.pagesize').val()
	});
});
