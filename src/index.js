/**
 * Visitor City Tracker - Cloudflare Worker
 *
 * GET  /  or /dashboard - Admin UI (table + map)
 * POST /hit             - Record a visit (skips common bots)
 * GET  /cities          - List visits
 * GET|POST /cleanup     - Fix labels + purge bot User-Agent records
 *
 * Binding: KV VISITORS
 */

const MAX_CITIES = 120;

const CN_CITY_COORDS = {"Baoding":[38.8739,115.4646],"Beijing":[39.9042,116.4074],"Changchun":[43.8171,125.3235],"Changsha":[28.2282,112.9388],"Changzhou":[31.8107,119.9741],"Chengdu":[30.5728,104.0668],"Chongqing":[29.4316,106.9123],"Dalian":[38.914,121.6147],"Dongguan":[23.0207,113.7518],"Foshan":[23.0215,113.1214],"Fuzhou":[26.0745,119.2965],"Guangzhou":[23.1291,113.2644],"Guilin":[25.2342,110.1799],"Guiyang":[26.647,106.6302],"Haikou":[20.044,110.1999],"Handan":[36.6256,114.5391],"Hangzhou":[30.2741,120.1551],"Harbin":[45.8038,126.534],"Hefei":[31.8206,117.2272],"Hohhot":[40.8424,111.7492],"Hong Kong":[22.3193,114.1694],"Huizhou":[23.1115,114.4152],"Jiaxing":[30.7461,120.7555],"Jinan":[36.6512,117.1201],"Jinhua":[29.0787,119.6478],"Kunming":[25.0389,102.7183],"Lanzhou":[36.0611,103.8343],"Lhasa":[29.6525,91.1721],"Linyi":[35.1041,118.3564],"Luoyang":[34.6197,112.454],"Macau":[22.1987,113.5439],"Nanchang":[28.682,115.8579],"Nanjing":[32.0603,118.7969],"Nanning":[22.817,108.3669],"Nantong":[32.0162,120.8943],"Ningbo":[29.8683,121.544],"Qingdao":[36.0671,120.3826],"Quanzhou":[24.8741,118.6757],"Sanya":[18.2528,109.5119],"Shanghai":[31.2304,121.4737],"Shaoxing":[30.0023,120.581],"Shenyang":[41.8057,123.4315],"Shenzhen":[22.5431,114.0579],"Shijiazhuang":[38.0428,114.5149],"Suzhou":[31.2989,120.5853],"Taipei":[25.033,121.5654],"Taiyuan":[37.8706,112.5489],"Taizhou":[28.6568,121.4206],"Tangshan":[39.6309,118.1802],"Tianjin":[39.3434,117.3616],"Urumqi":[43.8256,87.6168],"Weifang":[36.7069,119.1619],"Wenzhou":[27.9944,120.6994],"Wuhan":[30.5928,114.3055],"Wuhu":[31.3526,118.4329],"Wuxi":[31.4912,120.3119],"Xi'an":[34.3416,108.9398],"Xiamen":[24.4798,118.0894],"Xian":[34.3416,108.9398],"Xining":[36.6171,101.7782],"Xuzhou":[34.2058,117.2841],"Yancheng":[33.3477,120.1626],"Yangzhou":[32.3932,119.4215],"Yinchuan":[38.4872,106.2309],"Zhengzhou":[34.7466,113.6253],"Zhongshan":[22.517,113.3927],"Zhuhai":[22.271,113.5767],"Zibo":[36.8135,118.054],"七台河":[45.7713,131.0156],"七台河市":[45.7713,131.0156],"三亚":[18.2479,109.5083],"三亚市":[18.2479,109.5083],"三明":[26.2654,117.635],"三明市":[26.2654,117.635],"三沙":[16.831,112.3488],"三沙市":[16.831,112.3488],"三门峡":[34.7773,111.1941],"三门峡市":[34.7773,111.1941],"上海":[31.2317,121.4726],"上海市":[31.2317,121.4726],"上饶":[28.4444,117.9712],"上饶市":[28.4444,117.9712],"东莞":[23.0489,113.7602],"东莞市":[23.0489,113.7602],"东营":[37.4613,118.4963],"东营市":[37.4613,118.4963],"两江新区":[29.7292,106.4633],"中卫":[37.515,105.1896],"中卫市":[37.515,105.1896],"中山":[22.5211,113.3824],"中山市":[22.5211,113.3824],"临汾":[36.0842,111.518],"临汾市":[36.0842,111.518],"临沂":[35.0653,118.3264],"临沂市":[35.0653,118.3264],"临沧":[23.8866,100.087],"临沧市":[23.8866,100.087],"丹东":[40.1243,124.383],"丹东市":[40.1243,124.383],"丽水":[28.452,119.9218],"丽水市":[28.452,119.9218],"丽江":[26.8721,100.233],"丽江市":[26.8721,100.233],"乌兰察布":[41.0341,113.1145],"乌兰察布市":[41.0341,113.1145],"乌海":[39.6737,106.8256],"乌海市":[39.6737,106.8256],"乌鲁木齐":[43.7928,87.6177],"乌鲁木齐市":[43.7928,87.6177],"乐山":[29.582,103.7613],"乐山市":[29.582,103.7613],"九江":[29.712,115.9928],"九江市":[29.712,115.9928],"九龙":[22.3271,114.1749],"云林":[23.75,120.25],"云林县":[23.75,120.25],"云浮":[22.9298,112.0444],"云浮市":[22.9298,112.0444],"亳州":[33.8693,115.7829],"亳州市":[33.8693,115.7829],"伊春":[47.7248,128.8994],"伊春市":[47.7248,128.8994],"佛山":[23.0288,113.1227],"佛山市":[23.0288,113.1227],"佳木斯":[46.8096,130.3616],"佳木斯市":[46.8096,130.3616],"保定":[38.8677,115.4823],"保定市":[38.8677,115.4823],"保山":[25.1118,99.1671],"保山市":[25.1118,99.1671],"信阳":[32.1233,114.075],"信阳市":[32.1233,114.075],"克拉玛依":[45.5959,84.8739],"克拉玛依市":[45.5959,84.8739],"六安":[31.7529,116.5077],"六安市":[31.7529,116.5077],"六盘水":[26.5846,104.8467],"六盘水市":[26.5846,104.8467],"兰州":[36.058,103.8236],"兰州市":[36.058,103.8236],"兴安":[46.0763,122.0703],"兴安盟":[46.0763,122.0703],"内江":[29.5871,105.0661],"内江市":[29.5871,105.0661],"包头":[40.6582,109.8404],"包头市":[40.6582,109.8404],"北京":[39.905,116.4053],"北京市":[39.905,116.4053],"北海":[21.4733,109.1193],"北海市":[21.4733,109.1193],"十堰":[32.647,110.7852],"十堰市":[32.647,110.7852],"南京":[32.0415,118.7674],"南京市":[32.0415,118.7674],"南充":[30.7953,106.083],"南充市":[30.7953,106.083],"南宁":[22.824,108.32],"南宁市":[22.824,108.32],"南平":[26.6356,118.1785],"南平市":[26.6356,118.1785],"南投":[23.83,120.83],"南投县":[23.83,120.83],"南昌":[28.6765,115.8922],"南昌市":[28.6765,115.8922],"南通":[32.0162,120.8646],"南通市":[32.0162,120.8646],"南阳":[32.9991,112.5409],"南阳市":[32.9991,112.5409],"厦门":[24.4905,118.1102],"厦门市":[24.4905,118.1102],"双鸭山":[46.6434,131.1573],"双鸭山市":[46.6434,131.1573],"台东":[23.0,120.916],"台东县":[23.0,120.916],"台中":[24.1386,120.679],"台中市":[24.1386,120.679],"台北":[25.0378,121.5652],"台北市":[25.0378,121.5652],"台南":[23.1725,120.2794],"台南市":[23.1725,120.2794],"台州":[28.6614,121.4286],"台州市":[28.6614,121.4286],"台湾":[25.0443,121.5091],"合肥":[31.8612,117.283],"合肥市":[31.8612,117.283],"吉安":[27.1117,114.9864],"吉安市":[27.1117,114.9864],"吉林":[43.8436,126.553],"吉林市":[43.8436,126.553],"吐鲁番":[42.9476,89.1841],"吕梁":[37.5244,111.1343],"吕梁市":[37.5244,111.1343],"吴忠":[37.9862,106.1994],"吴忠市":[37.9862,106.1994],"周口":[33.6204,114.6497],"周口市":[33.6204,114.6497],"呼伦贝尔":[49.2153,119.7582],"呼伦贝尔市":[49.2153,119.7582],"呼和浩特":[40.8183,111.6708],"呼和浩特市":[40.8183,111.6708],"和田":[37.1107,79.9253],"和田地区":[37.1107,79.9253],"咸宁":[29.8328,114.329],"咸宁市":[29.8328,114.329],"咸阳":[34.3334,108.7051],"咸阳市":[34.3334,108.7051],"哈密":[42.8332,93.5132],"哈密地区":[42.8332,93.5132],"哈尔滨":[45.757,126.6425],"哈尔滨市":[45.757,126.6425],"唐山":[39.6351,118.1754],"唐山市":[39.6351,118.1754],"商丘":[34.4371,115.6505],"商丘市":[34.4371,115.6505],"商洛":[33.8683,109.9398],"商洛市":[33.8683,109.9398],"喀什":[39.4677,75.9891],"喀什地区":[39.4677,75.9891],"嘉义":[23.5,120.3],"嘉义县":[23.5,120.3],"嘉义市":[23.4816,120.4525],"嘉兴":[30.7627,120.7509],"嘉兴市":[30.7627,120.7509],"嘉峪关":[39.7865,98.2773],"嘉峪关市":[39.7865,98.2773],"四平":[43.1703,124.3708],"四平市":[43.1703,124.3708],"固原":[36.0046,106.2852],"固原市":[36.0046,106.2852],"基隆":[25.1307,121.7462],"基隆市":[25.1307,121.7462],"塔城":[46.7463,82.9857],"塔城地区":[46.7463,82.9857],"大兴安岭":[52.3353,124.7115],"大同":[40.0903,113.2953],"大同市":[40.0903,113.2953],"大庆":[46.5907,125.1127],"大庆市":[46.5907,125.1127],"大连":[38.9146,121.6186],"大连市":[38.9146,121.6186],"天水":[34.5785,105.725],"天水市":[34.5785,105.725],"天津":[39.1256,117.1902],"天津市":[39.1256,117.1902],"太原":[37.857,112.5492],"太原市":[37.857,112.5492],"威海":[37.5097,122.1164],"威海市":[37.5097,122.1164],"娄底":[27.7281,112.0085],"娄底市":[27.7281,112.0085],"孝感":[30.9264,113.9267],"孝感市":[30.9264,113.9267],"宁德":[26.6592,119.5271],"宁德市":[26.6592,119.5271],"宁波":[29.8684,121.5498],"宁波市":[29.8684,121.5498],"安庆":[30.5248,117.0536],"安庆市":[30.5248,117.0536],"安康":[32.6903,109.0293],"安康市":[32.6903,109.0293],"安阳":[36.1034,114.3525],"安阳市":[36.1034,114.3525],"安顺":[26.2455,105.9322],"安顺市":[26.2455,105.9322],"定西":[35.5796,104.6263],"定西市":[35.5796,104.6263],"宜兰":[24.6,121.5],"宜兰县":[24.6,121.5],"宜宾":[28.7602,104.6308],"宜宾市":[28.7602,104.6308],"宜昌":[30.7026,111.2908],"宜昌市":[30.7026,111.2908],"宜春":[27.8043,114.3911],"宜春市":[27.8043,114.3911],"宝鸡":[34.3693,107.1449],"宝鸡市":[34.3693,107.1449],"宣城":[30.9457,118.758],"宣城市":[30.9457,118.758],"宿州":[33.6339,116.9841],"宿州市":[33.6339,116.9841],"宿迁":[33.9452,118.2933],"宿迁市":[33.9452,118.2933],"屏东":[22.6828,120.4879],"屏东县":[22.6828,120.4879],"山南":[29.236,91.7665],"山南地区":[29.236,91.7665],"岳阳":[29.3703,113.1329],"岳阳市":[29.3703,113.1329],"崇左":[22.4041,107.3539],"崇左市":[22.4041,107.3539],"巴中":[31.8588,106.7537],"巴中市":[31.8588,106.7537],"巴彦淖尔":[40.7574,107.417],"巴彦淖尔市":[40.7574,107.417],"常州":[31.7728,119.947],"常州市":[31.7728,119.947],"常德":[29.0402,111.6913],"常德市":[29.0402,111.6913],"平凉":[35.5428,106.6847],"平凉市":[35.5428,106.6847],"平顶山":[33.7352,113.3077],"平顶山市":[33.7352,113.3077],"广元":[32.4337,105.8298],"广元市":[32.4337,105.8298],"广安":[30.4564,106.6334],"广安市":[30.4564,106.6334],"广州":[23.1252,113.2806],"广州市":[23.1252,113.2806],"庆阳":[35.7342,107.6384],"庆阳市":[35.7342,107.6384],"廊坊":[39.5292,116.7139],"廊坊市":[39.5292,116.7139],"延安":[36.5965,109.4908],"延安市":[36.5965,109.4908],"开封":[34.797,114.3414],"开封市":[34.797,114.3414],"张家口":[40.8119,114.8841],"张家口市":[40.8119,114.8841],"张家界":[29.1274,110.4799],"张家界市":[29.1274,110.4799],"张掖":[38.9329,100.4555],"张掖市":[38.9329,100.4555],"彰化":[24.0,120.416],"彰化县":[24.0,120.416],"徐州":[34.2618,117.1848],"徐州市":[34.2618,117.1848],"德州":[37.454,116.3074],"德州市":[37.454,116.3074],"德阳":[31.128,104.3987],"德阳市":[31.128,104.3987],"忻州":[38.4177,112.7335],"忻州市":[38.4177,112.7335],"怀化":[27.5501,109.9782],"怀化市":[27.5501,109.9782],"惠州":[23.0794,114.4126],"惠州市":[23.0794,114.4126],"成都":[30.6595,104.0657],"成都市":[30.6595,104.0657],"扬州":[32.3932,119.421],"扬州市":[32.3932,119.421],"承德":[40.9762,117.9392],"承德市":[40.9762,117.9392],"抚州":[27.9839,116.3584],"抚州市":[27.9839,116.3584],"抚顺":[41.876,123.9211],"抚顺市":[41.876,123.9211],"拉萨":[29.6604,91.1322],"拉萨市":[29.6604,91.1322],"揭阳":[23.5438,116.3557],"揭阳市":[23.5438,116.3557],"攀枝花":[26.5804,101.716],"攀枝花市":[26.5804,101.716],"新乡":[35.3026,113.884],"新乡市":[35.3026,113.884],"新余":[27.8108,114.9308],"新余市":[27.8108,114.9308],"新北":[25.0124,121.4657],"新北市":[25.0124,121.4657],"新界":[22.3418,114.2024],"新竹":[24.6,121.16],"新竹县":[24.6,121.16],"新竹市":[24.8067,120.9688],"无锡":[31.5747,120.3017],"无锡市":[31.5747,120.3017],"日喀则":[29.2638,88.8849],"日喀则市":[29.2638,88.8849],"日照":[35.4286,119.4612],"日照市":[35.4286,119.4612],"昆明":[25.0406,102.7123],"昆明市":[25.0406,102.7123],"昌都":[31.1369,97.1785],"昌都市":[31.1369,97.1785],"昭通":[27.337,103.7172],"昭通市":[27.337,103.7172],"晋中":[37.6965,112.7365],"晋中市":[37.6965,112.7365],"晋城":[35.4976,112.8513],"晋城市":[35.4976,112.8513],"普洱":[22.7773,100.9723],"普洱市":[22.7773,100.9723],"景德镇":[29.2926,117.2147],"景德镇市":[29.2926,117.2147],"曲靖":[25.5016,103.7979],"曲靖市":[25.5016,103.7979],"朔州":[39.3313,112.4334],"朔州市":[39.3313,112.4334],"朝阳":[41.5768,120.4512],"朝阳市":[41.5768,120.4512],"本溪":[41.2979,123.7705],"本溪市":[41.2979,123.7705],"来宾":[23.7338,109.2298],"来宾市":[23.7338,109.2298],"杭州":[30.2875,120.1536],"杭州市":[30.2875,120.1536],"松原":[45.1182,124.8236],"松原市":[45.1182,124.8236],"林芝":[29.6547,94.3623],"林芝地区":[29.6547,94.3623],"枣庄":[34.8564,117.558],"枣庄市":[34.8564,117.558],"柳州":[24.3146,109.4117],"柳州市":[24.3146,109.4117],"株洲":[27.8358,113.1517],"株洲市":[27.8358,113.1517],"桂林":[25.2742,110.2991],"桂林市":[25.2742,110.2991],"桃园":[25.0,121.083],"桃园县":[25.0,121.083],"梅州":[24.2991,116.1176],"梅州市":[24.2991,116.1176],"梧州":[23.4723,111.3162],"梧州市":[23.4723,111.3162],"榆林":[38.2902,109.7412],"榆林市":[38.2902,109.7412],"武威":[37.93,102.6347],"武威市":[37.93,102.6347],"武汉":[30.5844,114.2986],"武汉市":[30.5844,114.2986],"毕节":[27.3017,105.285],"毕节市":[27.3017,105.285],"永州":[26.4345,111.608],"永州市":[26.4345,111.608],"氹仔岛":[22.1568,113.5777],"汉中":[33.0777,107.0286],"汉中市":[33.0777,107.0286],"汕头":[23.371,116.7085],"汕头市":[23.371,116.7085],"汕尾":[22.7745,115.3642],"汕尾市":[22.7745,115.3642],"江门":[22.5904,113.0949],"江门市":[22.5904,113.0949],"池州":[30.656,117.4892],"池州市":[30.656,117.4892],"沈阳":[41.7968,123.4291],"沈阳市":[41.7968,123.4291],"沧州":[38.3106,116.8575],"沧州市":[38.3106,116.8575],"河池":[24.6959,108.0621],"河池市":[24.6959,108.0621],"河源":[23.7463,114.6978],"河源市":[23.7463,114.6978],"泉州":[24.9089,118.5894],"泉州市":[24.9089,118.5894],"泰安":[36.195,117.1291],"泰安市":[36.195,117.1291],"泰州":[32.4849,119.9152],"泰州市":[32.4849,119.9152],"泸州":[28.8891,105.4433],"泸州市":[28.8891,105.4433],"洛阳":[34.663,112.4345]};



const CN_NAME_MAP = {
  "\u5317\u4eac": "Beijing",
  "\u4e0a\u6d77": "Shanghai",
  "\u5e7f\u5dde": "Guangzhou",
  "\u6df1\u5733": "Shenzhen",
  "\u676d\u5dde": "Hangzhou",
  "\u5b81\u6ce2": "Ningbo",
  "\u5357\u4eac": "Nanjing",
  "\u82cf\u5dde": "Suzhou",
  "\u65e0\u9521": "Wuxi",
  "\u897f\u5b89": "Xi'an",
  "\u6210\u90fd": "Chengdu",
  "\u91cd\u5e86": "Chongqing",
  "\u6b66\u6c49": "Wuhan",
  "\u957f\u6c99": "Changsha",
  "\u90d1\u5dde": "Zhengzhou",
  "\u5929\u6d25": "Tianjin",
  "\u9752\u5c9b": "Qingdao",
  "\u5927\u8fde": "Dalian",
  "\u53a6\u95e8": "Xiamen",
  "\u798f\u5dde": "Fuzhou",
  "\u5408\u80a5": "Hefei",
  "\u6d4e\u5357": "Jinan",
  "\u6c88\u9633": "Shenyang",
  "\u54c8\u5c14\u6ee8": "Harbin",
  "\u957f\u6625": "Changchun",
  "\u6606\u660e": "Kunming",
  "\u5357\u5b81": "Nanning",
  "\u8d35\u9633": "Guiyang",
  "\u5357\u660c": "Nanchang",
  "\u592a\u539f": "Taiyuan",
  "\u77f3\u5bb6\u5e84": "Shijiazhuang",
  "\u5170\u5dde": "Lanzhou",
  "\u94f6\u5ddd": "Yinchuan",
  "\u897f\u5b81": "Xining",
  "\u547c\u548c\u6d69\u7279": "Hohhot",
  "\u4e4c\u9c81\u6728\u9f50": "Urumqi",
  "\u62c9\u8428": "Lhasa",
  "\u6d77\u53e3": "Haikou",
  "\u4e09\u4e9a": "Sanya",
  "\u4e1c\u839e": "Dongguan",
  "\u4f5b\u5c71": "Foshan",
  "\u73e0\u6d77": "Zhuhai",
  "\u4e2d\u5c71": "Zhongshan",
  "\u60e0\u5dde": "Huizhou",
  "\u6e29\u5dde": "Wenzhou",
  "\u5609\u5174": "Jiaxing",
  "\u7ecd\u5174": "Shaoxing",
  "\u53f0\u5dde": "Taizhou",
  "\u91d1\u534e": "Jinhua",
  "\u5f90\u5dde": "Xuzhou",
  "\u5e38\u5dde": "Changzhou",
  "\u5357\u901a": "Nantong",
  "\u626c\u5dde": "Yangzhou",
  "\u76d0\u57ce": "Yancheng",
  "\u4fdd\u5b9a": "Baoding",
  "\u5510\u5c71": "Tangshan",
  "\u6d1b\u9633": "Luoyang",
  "\u829c\u6e56": "Wuhu",
  "\u6cc9\u5dde": "Quanzhou",
  "\u6f4d\u574a": "Weifang",
  "\u6dc4\u535a": "Zibo",
  "\u4e34\u6c82": "Linyi",
  "\u90af\u90f8": "Handan",
  "\u6842\u6797": "Guilin",
  "\u9999\u6e2f": "Hong Kong",
  "\u6fb3\u95e8": "Macau",
  "\u53f0\u5317": "Taipei",
};


function isBotUA(ua) {
  if (!ua) return false;
  return /bot|crawler|crawl|spider|slurp|facebookexternalhit|preview|headless|phantom|selenium|httpclient|python-requests|curl\/|wget|scrapy|bytespider|petalbot|semrush|ahrefs|bingpreview|yandex|baiduspider|sogou|duckduckbot|applebot|twitterbot|linkedinbot|embedly|quora|pinterest|redditbot|discordbot|telegrambot|whatsapp|skypeuri|slackbot|chatgpt|gptbot|claudebot|anthropic|perplexity|ccbot/i.test(String(ua));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "*";
    const corsHeaders = {
      "Access-Control-Allow-Origin":
        allowedOrigin === "*" ? "*" : origin === allowedOrigin ? allowedOrigin : "",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

        try {
      if ((url.pathname === "/" || url.pathname === "/dashboard") && request.method === "GET") {
                const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Visitor Map · 访客明细</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#0b0b0e;color:#eee}
header,main{max-width:1400px;margin:0 auto;padding:1rem 1.25rem}
header{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem;border-bottom:1px solid #222}
h1{margin:0;font-size:1.1rem}p{margin:.3rem 0 0;color:#999;font-size:.85rem}
button,.btn{background:#141418;border:1px solid #333;color:#eee;padding:.4rem .8rem;border-radius:8px;cursor:pointer;text-decoration:none;font-size:.85rem}
button.primary{border-color:#ff6b2c;color:#ffb08a}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.6rem;margin:1rem 0}
.stat{background:#141418;border:1px solid #222;border-radius:10px;padding:.75rem}
.stat b{display:block;color:#ff6b2c;font-size:1.2rem;margin-top:.2rem}
.stat span{color:#888;font-size:.72rem}
#map{height:360px;width:100%;border-radius:12px;border:1px solid #222;margin:0 0 1rem;background:#111}
input{width:100%;max-width:420px;background:#141418;border:1px solid #333;border-radius:8px;color:#fff;padding:.5rem .75rem;margin:.5rem 0 1rem}
.wrap{overflow:auto;border:1px solid #222;border-radius:10px;max-height:55vh}
table{width:100%;border-collapse:collapse;font-size:.8rem}
th,td{padding:.5rem .65rem;border-bottom:1px solid #1c1c1c;text-align:left;white-space:nowrap;vertical-align:top}
th{background:#1a1a20;color:#888;position:sticky;top:0;z-index:1}
tr:nth-child(even){background:#121214}
.mu{color:#888}.city{font-weight:600}
.badge{border:1px solid #333;border-radius:999px;padding:.1rem .4rem;font-size:.72rem;color:#aaa}
.ua,.ref{max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;color:#aaa}
footer{margin-top:1rem;color:#777;font-size:.8rem}
.err{color:#ff8a80;text-align:center;padding:2rem}
.leaflet-container{background:#111;font:12px/1.4 system-ui,sans-serif}
</style>
</head>
<body>
<header>
  <div>
    <h1>Visitor Map · 访客明细</h1>
    <p>地图 + 时间 · 地理 · IP · ASN · UA · Referer</p>
  </div>
  <div>
    <button class="primary" id="r">刷新</button>
    <button id="cleanup">清洗 Bot</button>
    <a class="btn" href="/cities" target="_blank">JSON</a>
  </div>
</header>
<main>
  <div class="stats">
    <div class="stat"><span>总记录</span><b id="t">—</b></div>
    <div class="stat"><span>城市数</span><b id="c">—</b></div>
    <div class="stat"><span>国家/地区</span><b id="n">—</b></div>
    <div class="stat"><span>最近访问</span><b id="l" style="font-size:.95rem">—</b></div>
  </div>
  <div id="map"></div>
  <input id="q" type="search" placeholder="搜索城市 / IP / UA / ASN / Referer…"/>
  <div class="wrap">
    <table>
      <thead>
        <tr>
          <th>#</th><th>北京时间</th><th>GMT</th><th>城市</th><th>地区</th><th>国家</th><th>坐标</th>
          <th>IP</th><th>ASN</th><th>运营商</th><th>机房</th><th>时区</th><th>大陆</th>
          <th>协议</th><th>TLS</th><th>邮编</th><th>User-Agent</th><th>Referer</th>
        </tr>
      </thead>
      <tbody id="b">
        <tr><td colspan="18" class="mu" style="text-align:center;padding:2rem">加载中…</td></tr>
      </tbody>
    </table>
  </div>
  <footer>地图圆点大小表示该位置访问次数。清洗 Bot 会删除 User-Agent 含 bot/crawler 等关键词的历史记录。</footer>
</main>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  var all=[], B=document.getElementById('b'), Q=document.getElementById('q');
  var map=null, layer=null;
  function e(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
  function o(c){
    return [c.city,c.region,c.country,c.countryCode,c.ip,c.asOrg,c.colo,c.userAgent,c.referer,c.asn,c.timezone]
      .filter(Boolean).join(' ');
  }
  function ensureMap(){
    if(map) return;
    map=L.map('map',{scrollWheelZoom:true,worldCopyJump:true}).setView([20,0],2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:18, attribution:'&copy; OpenStreetMap'
    }).addTo(map);
    layer=L.layerGroup().addTo(map);
  }
  function drawMap(list){
    ensureMap();
    layer.clearLayers();
    var groups={}, bounds=[];
    (list||[]).forEach(function(c){
      var lat=Number(c.lat), lng=Number(c.lng);
      if(!Number.isFinite(lat)||!Number.isFinite(lng)) return;
      var key=(Math.round(lat*20)/20)+','+(Math.round(lng*20)/20);
      if(!groups[key]) groups[key]={lat:lat,lng:lng,count:1,city:c.city||'Unknown'};
      else {
        groups[key].count++;
        groups[key].lat+=lat; groups[key].lng+=lng;
        if(c.city) groups[key].city=c.city;
      }
    });
    Object.keys(groups).forEach(function(k){
      var g=groups[k];
      var la=g.lat/g.count, ln=g.lng/g.count;
      var r=Math.min(18, 6+Math.sqrt(g.count)*3);
      var m=L.circleMarker([la,ln],{
        radius:r, color:'#ff6b2c', weight:1, fillColor:'#ff6b2c', fillOpacity:0.55
      }).bindPopup('<b>'+e(g.city)+'</b><br/>访问 '+g.count+' 次');
      layer.addLayer(m);
      bounds.push([la,ln]);
    });
    if(bounds.length) map.fitBounds(bounds,{padding:[30,30],maxZoom:5});
    setTimeout(function(){ map.invalidateSize(); }, 100);
  }
  function draw(list){
    document.getElementById('t').textContent=all.length;
    var C={},N={};
    all.forEach(function(x){if(x.city)C[x.city]=1;var k=x.countryCode||x.country;if(k)N[k]=1});
    document.getElementById('c').textContent=Object.keys(C).length;
    document.getElementById('n').textContent=Object.keys(N).length;
    document.getElementById('l').textContent=all[0]?(all[0].timeBeijing||all[0].timeGMT||'—'):'—';
    drawMap(list);
    if(!list.length){B.innerHTML='<tr><td colspan="18" class="mu" style="text-align:center;padding:2rem">暂无记录</td></tr>';return}
    B.innerHTML=list.map(function(c,i){
      var la=c.lat!=null?Number(c.lat).toFixed(4):'—', ln=c.lng!=null?Number(c.lng).toFixed(4):'—';
      var ua=e(c.userAgent||'—'), ref=e(c.referer||'—');
      return '<tr>'
        +'<td class="mu">'+(i+1)+'</td>'
        +'<td>'+e(c.timeBeijing||'—')+'</td>'
        +'<td class="mu">'+e(c.timeGMT||'—')+'</td>'
        +'<td class="city">'+e(c.city||'Unknown')+'</td>'
        +'<td>'+e(c.region||'—')+'</td>'
        +'<td><span class="badge">'+e(c.countryCode||c.country||'—')+'</span></td>'
        +'<td class="mu">'+la+', '+ln+'</td>'
        +'<td>'+e(c.ip||'—')+'</td>'
        +'<td class="mu">'+e(c.asn!=null?c.asn:'—')+'</td>'
        +'<td>'+e(c.asOrg||'—')+'</td>'
        +'<td class="mu">'+e(c.colo||'—')+'</td>'
        +'<td class="mu">'+e(c.timezone||'—')+'</td>'
        +'<td class="mu">'+e(c.continent||'—')+'</td>'
        +'<td class="mu">'+e(c.httpProtocol||'—')+'</td>'
        +'<td class="mu">'+e(c.tlsVersion||'—')+'</td>'
        +'<td class="mu">'+e(c.postalCode||'—')+'</td>'
        +'<td title="'+ua+'"><span class="ua">'+ua+'</span></td>'
        +'<td title="'+ref+'"><span class="ref">'+ref+'</span></td>'
        +'</tr>';
    }).join('');
  }
  function filter(){
    var q=(Q.value||'').toLowerCase().trim();
    draw(!q?all:all.filter(function(c){return o(c).toLowerCase().indexOf(q)>=0}));
  }
  function load(){
    fetch('/cities',{cache:'no-store'})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
      .then(function(d){all=d.cities||[];filter()})
      .catch(function(err){B.innerHTML='<tr><td colspan="18" class="err">加载失败：'+e(err.message)+'</td></tr>'});
  }
  document.getElementById('r').onclick=load;
  document.getElementById('cleanup').onclick=function(){
    if(!confirm('删除 User-Agent 含 bot/crawler 等关键词的历史记录？')) return;
    fetch('/cleanup',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
      alert('已清洗。删除 Bot 约 '+(d.removedBots||0)+' 条，剩余 '+(d.total||0)+' 条');
      load();
    }).catch(function(err){alert('清洗失败：'+err.message)});
  };
  Q.oninput=filter;
  load();
  setInterval(load,60000);
})();
</script>
</body>
</html>`;

        return new Response(html, {
          status: 200,
          headers: Object.assign({
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          }, corsHeaders),
        });
      }
      if (url.pathname === "/hit" && request.method === "POST") {
        return await handleHit(request, env, corsHeaders);
      }
      if (url.pathname === "/cities" && request.method === "GET") {
        return await handleCities(env, corsHeaders);
      }
      if (url.pathname === "/cleanup" && (request.method === "POST" || request.method === "GET")) {
        return await handleCleanup(env, corsHeaders);
      }
      return json({ error: "Not found" }, 404, corsHeaders);
    } catch (err) {
      console.error(err);
      return json({ error: "Internal error" }, 500, corsHeaders);
    }
  },
};

async function handleHit(request, env, corsHeaders) {
  const cf = request.cf || {};
  const clientIp =
    request.headers.get("CF-Connecting-IP") ||
    (request.headers.get("X-Forwarded-For") || "").split(",")[0].trim() ||
    "";

  let city = (cf.city || "").toString().trim().slice(0, 64);
  let region = (cf.region || "").toString().trim().slice(0, 64);
  let countryCode = (cf.country || "").toString().trim().slice(0, 8).toUpperCase();
  let country = countryCode;
  let lat = Number(cf.latitude);
  let lng = Number(cf.longitude);

  try {
    const body = await request.json();
    if (body && typeof body === "object") {
      if (body.city) city = String(body.city).trim().slice(0, 64);
      if (body.country) country = String(body.country).trim().slice(0, 64);
      if (body.countryCode) countryCode = String(body.countryCode).trim().slice(0, 8).toUpperCase();
      if (Number.isFinite(Number(body.lat))) lat = Number(body.lat);
      if (Number.isFinite(Number(body.lng))) lng = Number(body.lng);
    }
  } catch {}

  if (clientIp && (countryCode === "CN" || countryCode === "HK" || countryCode === "MO" || countryCode === "TW" || !city)) {
    const refined = await refineGeo(clientIp, countryCode);
    if (refined) {
      if (refined.city) city = refined.city;
      if (refined.region) region = refined.region;
      if (refined.countryCode) countryCode = refined.countryCode;
      if (refined.country) country = refined.country;
      if (Number.isFinite(refined.lat)) lat = refined.lat;
      if (Number.isFinite(refined.lng)) lng = refined.lng;
    }
  }

  const normalized = normalizeCnCity(city);
  if (normalized) {
    city = normalized;
    const coords = CN_CITY_COORDS[normalized];
    if (coords) {
      lat = coords[0];
      lng = coords[1];
    }
  }

  if (looksLikeMojibake(city) || isProvinceOnlyName(city)) city = "";
  if (!city && region && !looksLikeMojibake(region) && !isProvinceOnlyName(region)) city = region;

  if ((!city || looksLikeMojibake(city)) && Number.isFinite(lat) && Number.isFinite(lng)) {
    const snapped = snapCityFromCoords(lat, lng);
    if (snapped) city = snapped;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    lat = null;
    lng = null;
  }

  if (!city && !countryCode && lat === null) {
    return json({ error: "Unable to resolve location" }, 400, corsHeaders);
  }

  const displayCity =
    city || (!looksLikeMojibake(region) && !isProvinceOnlyName(region) ? region : "") || "Unknown";
  const key = (countryCode || country) + "|" + displayCity;
  const now = Date.now();
  const times = formatVisitTimes(now);

  // Extra request metadata (for admin dashboard)
  const ua = (request.headers.get("User-Agent") || "").toString().slice(0, 300);
  if (isBotUA(ua)) {
    return json({ ok: true, skipped: "bot" }, 200, corsHeaders);
  }
  const referer = (request.headers.get("Referer") || request.headers.get("Referrer") || "").toString().slice(0, 300);
  const ip = (clientIp || "").toString().slice(0, 64);
  const asn = cf.asn != null ? Number(cf.asn) : null;
  const asOrg = (cf.asOrganization || "").toString().trim().slice(0, 128);
  const colo = (cf.colo || "").toString().trim().slice(0, 16);
  const timezone = (cf.timezone || "").toString().trim().slice(0, 64);
  const continent = (cf.continent || "").toString().trim().slice(0, 8);
  const httpProtocol = (cf.httpProtocol || "").toString().trim().slice(0, 32);
  const tlsVersion = (cf.tlsVersion || "").toString().trim().slice(0, 32);
  const postalCode = (cf.postalCode || "").toString().trim().slice(0, 32);

  let list = [];
  try {
    const raw = await env.VISITORS.get("cities", { type: "json" });
    if (Array.isArray(raw)) list = raw;
  } catch {}

  list.unshift({
    key,
    city: displayCity,
    region: region || "",
    country: country || "",
    countryCode: countryCode || "",
    lat,
    lng,
    ts: now,
    timeGMT: times.timeGMT,
    timeBeijing: times.timeBeijing,
    ip: ip || "",
    asn: Number.isFinite(asn) ? asn : null,
    asOrg: asOrg || "",
    colo: colo || "",
    timezone: timezone || "",
    continent: continent || "",
    httpProtocol: httpProtocol || "",
    tlsVersion: tlsVersion || "",
    postalCode: postalCode || "",
    userAgent: ua || "",
    referer: referer || "",
  });

  if (list.length > MAX_CITIES) list = list.slice(0, MAX_CITIES);
  await env.VISITORS.put("cities", JSON.stringify(list));

  return json(
    {
      ok: true,
      city: displayCity,
      region: region || "",
      countryCode,
      ts: now,
      timeGMT: times.timeGMT,
      timeBeijing: times.timeBeijing,
    },
    200,
    corsHeaders
  );
}

function normalizeCnCity(name) {
  if (!name) return "";
  let s = String(name).trim();
  // strip admin suffixes but keep core name for lookup
  let core = s.replace(/(特别行政区|壮族自治区|回族自治区|维吾尔自治区|自治区|省|市|地区|州|县)$/u, "");
  if (CN_NAME_MAP[s]) return CN_NAME_MAP[s];
  if (CN_NAME_MAP[core]) return CN_NAME_MAP[core];
  if (CN_CITY_COORDS[s]) return s;
  if (CN_CITY_COORDS[core]) return core;
  const title = s.charAt(0).toUpperCase() + s.slice(1);
  if (CN_CITY_COORDS[title]) return title;
  if (s === "Xi'an" || s === "Xi\u2019an" || core === "西安") return "Xi'an";
  return s;
}

function looksLikeMojibake(s) {
  if (!s) return true;
  const t = String(s);
  if (/\uFFFD/.test(t)) return true;
  const cjk = (t.match(/[\u4e00-\u9fff]/g) || []).length;
  const latin = (t.match(/[A-Za-z]/g) || []).length;
  if (cjk === 0 && latin === 0) return true;
  if (/[^\x00-\x7F\u4e00-\u9fff\s\-']/g.test(t) && cjk < 2 && latin < 2) return true;
  return false;
}

function isProvinceOnlyName(s) {
  const t = String(s || "").trim();
  return /(?:\u7701|\u81ea\u6cbb\u533a)$/.test(t) || /(?:Province)$/i.test(t);
}

async function refineGeo(ip, hintCountry) {
  if (!ip || ip.startsWith("127.") || ip === "::1") return null;

  try {
    const res = await fetch(
      "https://whois.pconline.com.cn/ipJson.jsp?ip=" + encodeURIComponent(ip) + "&json=true",
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*" } }
    );
    if (res.ok) {
      const buf = await res.arrayBuffer();
      let text = "";
      try {
        text = new TextDecoder("gb18030").decode(buf);
      } catch {
        try {
          text = new TextDecoder("gbk").decode(buf);
        } catch {
          text = new TextDecoder("utf-8").decode(buf);
        }
      }
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) {
          try {
            data = JSON.parse(m[0]);
          } catch {}
        }
      }
      if (data && (data.city || data.pro || data.addr)) {
        let city = (data.city || "").toString().trim();
        let region = (data.pro || "").toString().trim();
        if ((!city || isProvinceOnlyName(city) || looksLikeMojibake(city)) && data.addr) {
          const addr = String(data.addr);
          const cm = addr.match(/([\u4e00-\u9fa5]{2,12}?)(?:\u5e02|\u5730\u533a|\u5dde)/);
          if (cm) city = cm[1];
        }
        if (looksLikeMojibake(city)) city = "";
        if (looksLikeMojibake(region)) region = "";
        if (isProvinceOnlyName(city)) {
          if (!region) region = city;
          city = "";
        }
        if (city || region) {
          return {
            city: city || "",
            region,
            country: "China",
            countryCode: "CN",
            lat: NaN,
            lng: NaN,
          };
        }
      }
    }
  } catch (e) {
    console.error("pconline refine failed", e);
  }

  try {
    const res = await fetch(
      "http://ip-api.com/json/" +
        encodeURIComponent(ip) +
        "?fields=status,country,countryCode,regionName,city,lat,lon",
      { headers: { Accept: "application/json" } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === "success") {
        return {
          city: (data.city || "").toString().trim().slice(0, 64),
          region: (data.regionName || "").toString().trim().slice(0, 64),
          country: (data.country || "").toString().trim().slice(0, 64),
          countryCode: (data.countryCode || "").toString().trim().slice(0, 8).toUpperCase(),
          lat: Number(data.lat),
          lng: Number(data.lon),
        };
      }
    }
  } catch (e) {
    console.error("ip-api refine failed", e);
  }

  return null;
}

/** Format unix ms -> GMT (UTC) and Beijing (UTC+8) wall-clock strings */
function formatVisitTimes(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) {
    return { timeGMT: null, timeBeijing: null };
  }
  const pad = (x) => String(x).padStart(2, "0");
  const d = new Date(n);

  const timeGMT =
    d.getUTCFullYear() +
    "-" +
    pad(d.getUTCMonth() + 1) +
    "-" +
    pad(d.getUTCDate()) +
    " " +
    pad(d.getUTCHours()) +
    ":" +
    pad(d.getUTCMinutes()) +
    ":" +
    pad(d.getUTCSeconds()) +
    " GMT";

  // Beijing = UTC+8 (no DST)
  const b = new Date(n + 8 * 60 * 60 * 1000);
  const timeBeijing =
    b.getUTCFullYear() +
    "-" +
    pad(b.getUTCMonth() + 1) +
    "-" +
    pad(b.getUTCDate()) +
    " " +
    pad(b.getUTCHours()) +
    ":" +
    pad(b.getUTCMinutes()) +
    ":" +
    pad(b.getUTCSeconds()) +
    " CST";

  return { timeGMT, timeBeijing };
}

function isBadStoredName(s) {
  if (!s) return true;
  const t = String(s).trim();
  if (!t || t === "Unknown") return true;
  if (looksLikeMojibake(t) || isProvinceOnlyName(t)) return true;
  const ok = (t.match(/[A-Za-z\u4e00-\u9fff]/g) || []).join("");
  if (ok.length < 2) return true;
  if (ok.length / t.length < 0.5) return true;
  return false;
}

function snapCityFromCoords(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let best = null;
  let bestD = 0.55;
  for (const [name, coords] of Object.entries(CN_CITY_COORDS)) {
    if (name === "Xian") continue;
    const d = Math.abs(coords[0] - lat) + Math.abs(coords[1] - lng);
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best;
}

function fixStoredItem(item) {
  const lat = Number(item.lat);
  const lng = Number(item.lng);
  let city = (item.city || "").toString().trim();
  let region = (item.region || "").toString().trim();

  const normalized = normalizeCnCity(city);
  if (normalized && CN_CITY_COORDS[normalized]) {
    city = normalized;
  }

  if (isBadStoredName(city)) {
    const snapped = snapCityFromCoords(lat, lng);
    if (snapped) city = snapped;
    else if (!isBadStoredName(region)) city = region;
    else city = "Unknown";
  }

  if (CN_CITY_COORDS[city]) {
    return Object.assign({}, item, {
      city: city,
      region: region || "",
      lat: CN_CITY_COORDS[city][0],
      lng: CN_CITY_COORDS[city][1],
      key: (item.countryCode || item.country || "") + "|" + city,
    });
  }

  return Object.assign({}, item, {
    city: city,
    region: region || "",
    key: (item.countryCode || item.country || "") + "|" + city,
  });
}

async function handleCleanup(env, corsHeaders) {
  let list = [];
  try {
    const raw = await env.VISITORS.get("cities", { type: "json" });
    if (Array.isArray(raw)) list = raw;
  } catch {}

  const before = list.length;
  const withoutBots = list.filter(function (item) {
    return !isBotUA(item && item.userAgent);
  });
  const removedBots = before - withoutBots.length;
  const fixed = withoutBots.map(fixStoredItem);
  await env.VISITORS.put("cities", JSON.stringify(fixed));

  const sample = fixed.slice(0, 20).map(function (x) {
    return { city: x.city, lat: x.lat, lng: x.lng, userAgent: (x.userAgent || "").slice(0, 60) };
  });

  return json({
    ok: true,
    total: fixed.length,
    removedBots: removedBots,
    sample: sample,
  }, 200, corsHeaders);
}

async function handleCities(env, corsHeaders) {
  let list = [];
  try {
    const raw = await env.VISITORS.get("cities", { type: "json" });
    if (Array.isArray(raw)) list = raw;
  } catch {}

  const filtered = list.filter(function (item) {
    return !isBotUA(item && item.userAgent);
  });
  let changed = filtered.length !== list.length;
  const fixed = filtered.map(function (item) {
    const f = fixStoredItem(item);
    if (f.city !== item.city || f.lat !== item.lat || f.lng !== item.lng) changed = true;
    return f;
  });

  if (changed) {
    try {
      await env.VISITORS.put("cities", JSON.stringify(fixed));
    } catch (e) {
      console.error("migrate put failed", e);
    }
  }

  const cities = fixed.map(function (item) {
    const times = formatVisitTimes(item.ts);
    return {
      city: item.city,
      region: item.region || "",
      country: item.country,
      countryCode: item.countryCode,
      lat: item.lat,
      lng: item.lng,
      ts: item.ts,
      timeGMT: item.timeGMT || times.timeGMT,
      timeBeijing: item.timeBeijing || times.timeBeijing,
      ip: item.ip || "",
      asn: item.asn != null ? item.asn : null,
      asOrg: item.asOrg || "",
      colo: item.colo || "",
      timezone: item.timezone || "",
      continent: item.continent || "",
      httpProtocol: item.httpProtocol || "",
      tlsVersion: item.tlsVersion || "",
      postalCode: item.postalCode || "",
      userAgent: item.userAgent || "",
      referer: item.referer || "",
    };
  });

  return json({ cities: cities }, 200, corsHeaders);
}

function json(data, status, extraHeaders) {
  status = status || 200;
  extraHeaders = extraHeaders || {};
  return new Response(JSON.stringify(data), {
    status: status,
    headers: Object.assign({ "Content-Type": "application/json" }, extraHeaders),
  });
}
