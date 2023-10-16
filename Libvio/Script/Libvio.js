
const path1 = '/xgapp.php/v3/video_detail';
const path2 = '/xgapp.php/v3/video';
let obj = JSON.parse($response.body);

if ($request.url.indexOf(path1) != -1) {
  body = $response.body.replace(/\"download_permission":\d+/g, '\"download_permission":1')
                         .replace(/\"trysee_permission":\d+/g, '\"trysee_permission":1')
                         .replace(/\"download_need_permissio":\d+/g, '\"download_need_permissio":1')
                         .replace(/\"play_need_permission":\d+/g, '\"play_need_permission":1')     
                         .replace(/\"play_permission":\d+/g, '\"play_permission":1')      
                         .replace(/\"parse_after_config_enable":\d+/g, '\"parse_after_config_enable":1') 
$done({body});
 }

if ($request.url.indexOf(path2) != -1) {
body = $response.body.replace(/\"no_permission":\w+/g, '\"no_permission":false')
 $done({body});
 }
$done({body:JSON.stringify(obj)});

