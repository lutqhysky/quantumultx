var body = $response.body.replace(/groupid":\d+/g, 'groupid":4').replace(/jomkenylv":"\d+"/g, 'jomkenylv":"5"').replace(/overduedate":\d+/g, 'overduedate": 4100726753').replace(/overduedate2":\d+/g, 'overduedate2": 4100726753').replace(/groupname":".*?"/g, 'groupname":"官方认证"').replace(/username":".*?"/g, 'username":"清清情"');
$done({body});
