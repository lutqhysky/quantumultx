var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/xgapp.php/v3/video_detail';
const path2 = '/xgapp.php/v3/video';

if (url.indexOf(vip) != -1) {
obj.data.permission_info.download_permission = 1;
obj.data.permission_info.trysee_permission = 1;
obj.data.permission_info.download_need_permission = 0;
obj.data.permission_info.play_need_permission = 0;
obj.data.permission_info.play_permission = 1; 
   body = JSON.stringify(obj);    
}
if (url.indexOf(path2) != -1) {
obj.no_permission = false;  
    body = JSON.stringify(obj);    
}
$done({body});

const path1 = '/xgapp.php/v3/video_detail';
if ($request.url.indexOf(ytapi) != -1){body = $response.body.replace(/\"download_permission":\d+/g,'\"download_permission":1').replace(/\"trysee_permission":\d+/g,'\"trysee_permission":1');}
$done({body})
