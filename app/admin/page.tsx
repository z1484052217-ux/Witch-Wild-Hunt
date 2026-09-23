import {Header,Footer} from '../chrome';
import {adminUser} from '@/lib/admin-auth';
import Workspace from './workspace';
import EmailLogin from './email-login';
export const dynamic='force-dynamic';
export default async function Admin(){const allowed=await adminUser();return <div className="atlas-shell"><Header/><main className="main admin-main">{allowed?<Workspace emailMode/>:<EmailLogin/>}</main><Footer/></div>}
