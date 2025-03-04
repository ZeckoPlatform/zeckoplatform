"use strict";(self.webpackChunkgrafana=self.webpackChunkgrafana||[]).push([[1927],{68932:(Q,U,n)=>{n.r(U),n.d(U,{default:()=>be});var i=n(32196),e=n(96540),N=n(16817),G=n(14236),H=n(12131),I=n(40845),K=n(62930),D=n(42418),M=n(66864),j=n(8984),s=n(55852),u=n(63021),P=n(40675),A=n(28138),F=n(36830),O=n(25249),X=n(28444);function k({onPathChange:t}){return e.createElement("div",null,e.createElement("div",null,"TODO... Add ROOT"),e.createElement(s.$n,{variant:"secondary",onClick:()=>t("/")},"Cancel"))}var z=n(2543),V=n(14578);function q({pathName:t,onPathChange:r,rootIcon:m}){const a=(0,I.of)(_),o=t.split("/").filter(Boolean);return e.createElement("ul",{className:a.breadCrumb},m&&e.createElement("li",null,e.createElement(V.I,{name:m,onClick:()=>r("")})),o.map((l,w)=>{let g="/"+o.slice(0,w+1).join("/");const p=()=>r(g),x=w===o.length-1;return e.createElement("li",{key:(0,z.uniqueId)(l),onClick:x?void 0:p},l)}))}function _(t){return{breadCrumb:(0,i.css)`
      list-style: none;
      padding: ${t.spacing(2,1)};

      li {
        display: inline;

        :not(:last-child) {
          color: ${t.colors.text.link};
          cursor: pointer;
        }
        + li:before {
          content: '>';
          padding: ${t.spacing(1)};
          color: ${t.colors.text.secondary};
        }
      }
    `}}var Z=n(37390),ee=n(51253),te=n(88575),ne=n(10354);const ae={folderName:""};function re({validate:t,onDismiss:r,onSubmit:m}){return e.createElement(Z.a,{onDismiss:r,isOpen:!0,title:"New Folder"},e.createElement(ee.l,{defaultValues:ae,onSubmit:m,maxWidth:"none"},({register:a,errors:o})=>e.createElement(e.Fragment,null,e.createElement(te.D,{label:"Folder name",invalid:!!o.folderName,error:o.folderName&&o.folderName.message},e.createElement(ne.p,{id:"folder-name-input",...a("folderName",{required:"Folder name is required.",validate:{validate:t}})})),e.createElement(Z.a.ButtonRow,null,e.createElement(s.$n,{type:"submit"},"Create")))))}var J=n(70713),se=n(32372),oe=n(47694),S=n(53652),C=(t=>(t.Data="data",t.Config="config",t.Perms="perms",t.History="history",t.AddRoot="add",t))(C||{}),le=(t=>(t.Save="save",t.PR="pr",t.Push="push",t))(le||{});function ie({listing:t,path:r,onPathChange:m,view:a}){const o=(0,I.of)(de),l=(0,e.useMemo)(()=>ce(r),[r]),w=(0,N.A)(async()=>{if(l.category==="text"){const p=await(0,S.o)().get(r);return(0,z.isString)(p)?p:JSON.stringify(p,null,2)}return null},[l,r]);switch(a){case C.Config:return e.createElement("div",null,"CONFIGURE?");case C.Perms:return e.createElement("div",null,"Permissions");case C.History:return e.createElement("div",null,"TODO... history")}let g=`api/storage/read/${r}`;switch(g.endsWith("/")&&(g=g.substring(0,g.length-1)),l.category){case"svg":return e.createElement("div",null,e.createElement(oe.y,{src:g,className:o.icon}));case"image":return e.createElement("div",null,e.createElement("a",{target:"_self",href:g},e.createElement("img",{src:g,alt:"File preview",className:o.img})));case"text":return e.createElement("div",{className:o.tableWrapper},e.createElement(J.Ay,null,({width:p,height:x})=>e.createElement(se.B,{width:p,height:x,value:w.value??"",showLineNumbers:!1,readOnly:!0,language:l.language??"text",showMiniMap:!1,onBlur:h=>{console.log("CHANGED!",h)}})))}return e.createElement("div",null,"FILE: ",e.createElement("a",{href:g},r))}function ce(t){const r=t.lastIndexOf(".");if(r<0)return{};switch(t.substring(r+1).toLowerCase()){case"svg":return{category:"svg"};case"jpg":case"jpeg":case"png":case"webp":case"gif":return{category:"image"};case"geojson":case"json":return{category:"text",language:"json"};case"text":case"go":case"md":return{category:"text"}}return{}}const de=t=>({wrapper:(0,i.css)`
    display: flex;
    flex-direction: column;
    height: 100%;
  `,tableControlRowWrapper:(0,i.css)`
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: ${t.spacing(2)};
  `,tableWrapper:(0,i.css)`
    border: 1px solid ${t.colors.border.medium};
    height: 100%;
  `,uploadSpot:(0,i.css)`
    margin-left: ${t.spacing(2)};
  `,border:(0,i.css)`
    border: 1px solid ${t.colors.border.medium};
    padding: ${t.spacing(2)};
  `,img:(0,i.css)`
    max-width: 100%;
    // max-height: 147px;
    // fill: ${t.colors.text.primary};
  `,icon:(0,i.css)`
    // max-width: 100%;
    // max-height: 147px;
    // fill: ${t.colors.text.primary};
  `});var ue=n(77093);function me({listing:t,view:r}){const m=(0,I.of)(ge);switch(r){case C.Config:return e.createElement("div",null,"CONFIGURE?");case C.Perms:return e.createElement("div",null,"Permissions")}return e.createElement("div",{className:m.tableWrapper},e.createElement(J.Ay,null,({width:a,height:o})=>e.createElement("div",{style:{width:`${a}px`,height:`${o}px`}},e.createElement(ue.X,{height:o,width:a,data:t,noHeader:!1,showTypeIcons:!1,resizable:!1}))))}const ge=t=>({wrapper:(0,i.css)`
    display: flex;
    flex-direction: column;
    height: 100%;
  `,tableControlRowWrapper:(0,i.css)`
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: ${t.spacing(2)};
  `,tableWrapper:(0,i.css)`
    border: 1px solid ${t.colors.border.medium};
    height: 100%;
  `,uploadSpot:(0,i.css)`
    margin-left: ${t.spacing(2)};
  `,border:(0,i.css)`
    border: 1px solid ${t.colors.border.medium};
    padding: ${t.spacing(2)};
  `});var W=n(10860),fe=n(64149),pe=n(14186),he=n(67647);function Ee({root:t,onPathChange:r}){const m=(0,I.of)(ve),a=(0,N.A)((0,S.o)().getConfig),[o,l]=(0,e.useState)("");let w=location.pathname;w.endsWith("/")||(w+="/");const g=(0,e.useMemo)(()=>{let x=a.value??[];if(o?.length){const E=o.toLowerCase();x=x.filter(b=>{const d=b.config;return d.name.toLowerCase().indexOf(E)>=0||d.description.toLowerCase().indexOf(E)>=0})}const h=[],c=[];for(const E of x??[])E.config.underContentRoot?c.push(E):E.config.prefix!=="content"&&h.push(E);return{base:h,content:c}},[o,a]),p=(x,h)=>e.createElement(M.gW,null,h.map(c=>{const E=c.ready;return e.createElement(W.Z,{key:c.config.prefix,href:E?`admin/storage/${x}${c.config.prefix}/`:void 0},e.createElement(W.Z.Heading,null,c.config.name),e.createElement(W.Z.Meta,{className:m.clickable},c.config.description,c.config.git?.remote&&e.createElement("a",{href:c.config.git?.remote},c.config.git?.remote)),c.notice?.map(b=>e.createElement(D.F,{key:b.text,severity:b.severity,title:b.text})),e.createElement(W.Z.Tags,{className:m.clickable},e.createElement(M.Gy,null,e.createElement(fe.L,{tags:ye(c)}))),e.createElement(W.Z.Figure,{className:m.clickable},e.createElement(V.I,{name:xe(c.config.type),size:"xxxl",className:m.secondaryTextColor})))}));return e.createElement("div",null,e.createElement("div",{className:"page-action-bar"},e.createElement(pe.I,{grow:!0},e.createElement(he.Z,{placeholder:"Search Storage",value:o,onChange:l})),e.createElement(s.$n,{className:"pull-right",onClick:()=>r("",C.AddRoot)},"Add Root")),e.createElement("div",null,p("",g.base)),e.createElement("div",null,e.createElement("h3",null,"Content"),p("content/",g.content)))}function ve(t){return{secondaryTextColor:(0,i.css)`
      color: ${t.colors.text.secondary};
    `,clickable:(0,i.css)`
      pointer-events: none;
    `}}function ye(t){const r=[];return t.builtin&&r.push("Builtin"),t.ready||r.push("Not ready"),r}function xe(t){switch(t){case"git":return"code-branch";case"disk":return"folder-open";case"sql":return"database";default:return"folder-open"}}var Ce=n(73546),Fe=n(96374);const we="image/jpg, image/jpeg, image/png, image/gif, image/webp";function $e({setErrorMessages:t,setPath:r,path:m,fileNames:a}){const o=(0,I.of)(Ne),[l,w]=(0,e.useState)(void 0),[g,p]=(0,e.useState)(!1),[x,h]=(0,e.useState)(1),[c,E]=(0,e.useState)(!0);(0,e.useEffect)(()=>{h(f=>f+1)},[l]);const b=f=>{console.log("Uploaded: "+m),f.path?r(f.path):r(m)},d=async(f,T)=>{if(!f){t(["Please select a file."]);return}const L=await(0,S.o)().upload(m,f,T);L.status!==200?t([L.message]):b(L)},v=f=>{t([]);const T=f.currentTarget.files&&f.currentTarget.files.length>0&&f.currentTarget.files[0]?f.currentTarget.files[0]:void 0;T&&(w(T),(0,S.E)(T.name,a)?(p(!0),E(!0)):(p(!1),d(T,!1).then(y=>{})))},$=()=>{l&&(d(l,!0).then(f=>{}),E(!1))},R=()=>{w(void 0),p(!1),E(!1)};return e.createElement(e.Fragment,null,e.createElement(Ce.e,{accept:we,onFileUpload:v,key:x,className:o.uploadButton},"Upload"),l&&g&&e.createElement(Fe.u,{isOpen:c,body:e.createElement("div",null,e.createElement("p",null,l?.name),e.createElement("p",null,"A file with this name already exists."),e.createElement("p",null,"What would you like to do?")),title:"This file already exists",confirmText:"Replace",onConfirm:$,onDismiss:R}))}const Ne=t=>({uploadButton:(0,i.css)`
    margin-right: ${t.spacing(2)};
  `}),Ae=/^[a-z\d!\-_.*'() ]+$/,Y=256,Oe=t=>{const r=t.lastIndexOf("/");return r<1?"":t.substring(0,r)};function be(t){const r=(0,I.of)(Ie),m=(0,O.C)("storage"),a=t.match.params.path??"",o=t.queryParams.view??C.Data,l=(d,v)=>{let $=("/admin/storage/"+d).replace("//","/");v&&v!==C.Data&&($+="?view="+v),H.Ny.push($)},[w,g]=(0,e.useState)(!1),[p,x]=(0,e.useState)([]),h=(0,N.A)(()=>(0,S.o)().list(a).then(d=>{if(d){const v=d.fields[0];d.fields[0]={...v,getLinks:$=>{const R=v.values[$.valueRowIndex??0],f=a+"/"+R;return[{title:`Open ${R}`,href:`/admin/storage/${f}`,target:"_self",origin:v,onClick:()=>{l(f)}}]}}}return d}),[a]),c=(0,e.useMemo)(()=>{let d=a?.indexOf("/")<0;if(h.value)if(h.value.length===1){const $=h.value.fields[0].values[0];d=!a.endsWith($)}else d=!0;return d},[a,h]),E=(0,e.useMemo)(()=>h.value?.fields?.find(d=>d.name==="name")?.values.filter(d=>typeof d=="string")??[],[h]),b=()=>{const d=!a?.length||a==="/";switch(o){case C.AddRoot:return d?e.createElement(k,{onPathChange:l}):(l(""),e.createElement(K.y,null))}const v=h.value;if(!(0,G.ci)(v))return e.createElement(e.Fragment,null);if(d)return e.createElement(Ee,{root:v,onPathChange:l});const $=[{what:C.Data,text:"Data"}];a.indexOf("/")<0&&$.push({what:C.Config,text:"Configure"}),c||$.push({what:C.History,text:"History"});const R=c&&(a.startsWith("resources")||a.startsWith("content")),f=a.startsWith("resources/")||a.startsWith("content/"),T=()=>e.createElement("div",{className:r.errorAlert},e.createElement(D.F,{title:"Upload failed",severity:"error",onRemove:L},p.map(y=>e.createElement("div",{key:y},y)))),L=()=>{x([])};return e.createElement("div",{className:r.wrapper},e.createElement(M.Gy,{width:"100%",justify:"space-between",spacing:"md",height:25},e.createElement(q,{pathName:a,onPathChange:l,rootIcon:(0,j.toIconName)(m.node.icon??"")}),e.createElement(M.Gy,null,R&&e.createElement(e.Fragment,null,e.createElement($e,{path:a,setErrorMessages:x,fileNames:E,setPath:l}),e.createElement(s.$n,{onClick:()=>g(!0)},"New Folder")),f&&e.createElement(s.$n,{variant:"destructive",onClick:()=>{const y=c?"Are you sure you want to delete this folder and all its contents?":"Are you sure you want to delete this file?",B=Oe(a);A.A.publish(new X.bY({title:`Delete ${c?"folder":"file"}`,text:y,icon:"trash-alt",yesText:"Delete",onConfirm:()=>(0,S.o)().delete({path:a,isFolder:c}).then(()=>{l(B)})}))}},"Delete"))),p.length>0&&T(),e.createElement(u.U,null,$.map(y=>e.createElement(P.o,{key:y.what,label:y.text,active:y.what===o,onChangeTab:()=>l(a,y.what)}))),c?e.createElement(me,{listing:v,view:o}):e.createElement(ie,{path:a,listing:v,onPathChange:l,view:o}),w&&e.createElement(re,{onSubmit:async({folderName:y})=>{const B=`${a}/${y}`;typeof(await(0,S.o)().createFolder(B))?.error!="string"&&(l(B),g(!1))},onDismiss:()=>{g(!1)},validate:y=>{const B=y.toLowerCase();return(0,S.E)(y,E)?"A file or a folder with the same name already exists":Ae.test(B)?y.length>Y?`Name is too long, maximum length: ${Y} characters`:!0:"Name contains illegal characters"}}))};return e.createElement(F.Y,{navModel:m},e.createElement(F.Y.Contents,{isLoading:h.loading},b()))}const Ie=t=>({wrapper:(0,i.css)`
    display: flex;
    flex-direction: column;
    height: 100%;
  `,tableControlRowWrapper:(0,i.css)`
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: ${t.spacing(2)};
  `,tableWrapper:(0,i.css)`
    border: 1px solid ${t.colors.border.medium};
    height: 100%;
  `,border:(0,i.css)`
    border: 1px solid ${t.colors.border.medium};
    padding: ${t.spacing(2)};
  `,errorAlert:(0,i.css)`
    padding-top: 20px;
  `,uploadButton:(0,i.css)`
    margin-right: ${t.spacing(2)};
  `})},53652:(Q,U,n)=>{n.d(U,{E:()=>K,o:()=>M});var i=n(89667),e=n(57875),N=n(17172),G=n(32264),H=n(27677);class I{constructor(){}async get(s){const u=`api/storage/read/${s}`.replace("//","/");return(0,N.AI)().get(u)}async list(s){let u="api/storage/list/";s&&(u+=s+"/");const P=await(0,N.AI)().get(u);if(P?.data){const A=(0,i.or)(P);for(const F of A.fields)F.display=(0,e.J)({field:F,theme:G.$.theme2});return A}}async createFolder(s){const u=await(0,N.AI)().post("/api/storage/createFolder",JSON.stringify({path:s}));return u.success?{}:{error:u.message??"unknown error"}}async deleteFolder(s){const u=await(0,N.AI)().post("/api/storage/deleteFolder",JSON.stringify(s));return u.success?{}:{error:u.message??"unknown error"}}async deleteFile(s){const u=await(0,N.AI)().post(`/api/storage/delete/${s.path}`);return u.success?{}:{error:u.message??"unknown error"}}async delete(s){return s.isFolder?this.deleteFolder({path:s.path,force:!0}):this.deleteFile({path:s.path})}async upload(s,u,P){const A=new FormData;A.append("folder",s),A.append("file",u),A.append("overwriteExistingFile",String(P));const F=await fetch("/api/storage/upload",{method:"POST",body:A});let O=await F.json();return O||(O={}),O.status=F.status,O.statusText=F.statusText,F.status!==200&&!O.err&&(O.err=!0),O}async write(s,u){return H.IB.post(`/api/storage/write/${s}`,u)}async getConfig(){return(0,N.AI)().get("/api/storage/config")}async getOptions(s){return(0,N.AI)().get(`/api/storage/options/${s}`)}}function K(j,s){const P=j.toLowerCase().trim();return s.map(F=>F.trim().toLowerCase()).includes(P)}let D;function M(){return D||(D=new I),D}}}]);

//# sourceMappingURL=StoragePage.9b93a99e75f7f2842c11.js.map