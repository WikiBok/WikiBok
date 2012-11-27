<?php
# INSTALL環境によって変更あり
define('PHPCOM','php');
define('SVGCONVERT_CMD','rsvg-convert');
define('SVGCONVERT_FOLDER',realpath(__DIR__."/../dot/"));
define('SVGCSS_FILE',realpath(__DIR__.'/../css/WikiBok.svg.css'));
# 仮決めでA4を設定(拡大印刷する場合にはPDFを拡大印刷してください)
define('SVGCONVERT_A4W', 794); #用紙サイズ(横)
define('SVGCONVERT_A4H',1123); #用紙サイズ(縦)
# クラスファイル名称
define('BOK_MERGER_XMLCLASS','BokXml.class.php');
define('BOK_MERGER_MERGERCLASS','BokXmlMerger.class.php');
########################################
#   BOK-XMLの設定
########################################
define('BOK_SETTING','BOKXML');
# XMLスキーマファイルの設定
define('BOKXML_SCHEMAFILE',realpath(dirname(__FILE__))."/BOK_schema.xml");
define('BOKXML_SEPARATE_CHAR',"\0");
# MBT算出用設定
define('BOKXML_DELNODE_FULL',TRUE);	#DS算出で自身のノードを含める/含めない
# IS算出で自身のノードを含める/含めない(ロジックの関係上,変更不可/上記の反対を採用とする)
define('BOKXML_INSNODE_FULL',!BOKXML_DELNODE_FULL);
########################################
#   代表表現関連設定[追加@2012/10]
########################################
# 代表表現編集をする/しない
define('BOK_REPRESENT_EDIT',TRUE);
# 代表表現選択時に代表表現以外に選択したノード配下のノードを削除する/しない
define('BOKXML_REPRESENT_CHILD_DELETE',FALSE);
# 代表表現を表すリンク名称として使用する文字列定義(一度定義した後は変更しないでください)
define('BOK_LINKTYPE_REPRESENT','reps');
########################################
#   データ構造設定(トピック)[追加@2012/11]
########################################
define('BOK_LINKTYPE_TOPIC','about');
########################################
#   Mergerの設定
########################################
#競合解消に使用するリビジョン番号
define('BOKMERGE_ACTIVE_REV',1);
# PAGER
define('WIKIBOK_SEARCH_PAGE_MIN',10);
define('WIKIBOK_SEARCH_PAGE_MAX',300);
define('WIKIBOK_SEARCH_PAGE_PLUS',100);
