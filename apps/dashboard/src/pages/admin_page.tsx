import {admin_panel} from "../components/admin/admin_panel";
import {developer_panel} from "../components/settings/developer_panel";
import {rag_panel} from "../components/rag/rag_panel";
import {providers_panel} from "../components/providers/providers_panel";
import {server_manager} from "../components/server/server_manager";
import {services_panel} from "../components/services/services_panel";
import {model_manager} from "../components/models/model_manager";
import {model_downloads} from "../components/downloads/model_downloads";
import {api_keys_panel} from "../components/admin/api_keys_panel";

export function admin_page(){

return(

<div className="space-y-8">

{admin_panel()}

{api_keys_panel()}

{model_downloads()}

{model_manager()}

{services_panel()}

{server_manager()}

{providers_panel()}

{rag_panel()}

{developer_panel()}

</div>

);

}
