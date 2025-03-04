"use strict";(self.webpackChunkgrafana=self.webpackChunkgrafana||[]).push([[6678],{68313:(_,R,t)=>{t.d(R,{$:()=>m});var l=t(32196),e=t(96540),o=t(32264),I=t(40845),D=t(55852),x=t(88323),$=t(14578),d=t(17706);const m=({onChange:u,maxMenuHeight:h,isWidget:f=!1})=>{const p=()=>o.$.featureToggles.vizAndWidgetSplit?f?(0,d.nr)():(0,d.if)():(0,d.A4)(),P=(0,e.useMemo)(p,[f]),A=(0,e.useMemo)(()=>P.map(r=>({label:r.name,imgUrl:r.info.logos.small,value:r})).sort((r,y)=>r.label?.localeCompare(y.label)),[P]),[M,U]=(0,e.useState)([]),i=(0,e.useCallback)(r=>{const y=r.filter(O=>O.value).map(O=>O.value);u(y),U(r)},[u]),S=(0,I.of)(g),z={defaultOptions:!0,getOptionLabel:r=>r.label,getOptionValue:r=>r.value,noOptionsMessage:"No Panel types found",placeholder:"Filter by type",maxMenuHeight:h,options:A,value:M,onChange:i};return e.createElement("div",{className:S.container},M.length>0&&e.createElement(D.$n,{size:"xs",icon:"trash-alt",fill:"text",className:S.clear,onClick:()=>i([]),"aria-label":"Clear types"},"Clear types"),e.createElement(x.KF,{...z,prefix:e.createElement($.I,{name:"filter"}),"aria-label":"Panel Type filter"}))};function g(u){return{container:(0,l.css)`
      label: container;
      position: relative;
      min-width: 180px;
      flex-grow: 1;
    `,clear:(0,l.css)`
      label: clear;
      font-size: ${u.spacing(1.5)};
      position: absolute;
      top: -${u.spacing(4.5)};
      right: 0;
    `}}},73725:(_,R,t)=>{t.d(R,{r:()=>d});var l=t(96540),e=t(16817),o=t(88323),I=t(14578),D=t(53477),x=t(24439);const $=()=>(0,x.getGrafanaSearcher)().getSortOptions();function d({onChange:m,value:g,placeholder:u,filter:h,getSortOptions:f,isClearable:p}){const P=(0,e.A)(async()=>{const M=await(f??$)();return h?M.filter(U=>h.includes(U.value)):M},[f,h]);if(P.loading)return null;const A=!!(g?.includes("desc")||g?.startsWith("-"));return l.createElement(o.l6,{key:g,width:28,onChange:m,value:P.value?.find(M=>M.value===g)??null,options:P.value,"aria-label":"Sort",placeholder:u??`Sort (Default ${D.r4.label})`,prefix:l.createElement(I.I,{name:A?"sort-amount-down":"sort-amount-up"}),isClearable:p})}},86474:(_,R,t)=>{t.d(R,{E:()=>E});var l=t(32196),e=t(96540),o=t(70255),I=t(32264),D=t(40845),x=t(14578),$=t(50720),d=t(72129),m=t(41394),g=t(25701),u=t(39070),h=t(37390),f=t(55852),p=t(43535),P=t(38928),A=t(57767),M=t(30038);const U={loadingState:u.Gu.Loading,dashboardTitles:[]},i=(0,M.VP)("libraryPanels/delete/searchCompleted"),S=(a=U,s)=>i.match(s)?{...a,dashboardTitles:s.payload.dashboards.map(c=>c.title),loadingState:u.Gu.Done}:a;function z(a){return async function(s){const c=await(0,A.xV)(a.uid);s(i({dashboards:c}))}}const r=({libraryPanel:a,onDismiss:s,onConfirm:c})=>{const T=(0,D.of)(p.o),[{dashboardTitles:b,loadingState:W},B]=(0,e.useReducer)(S,U),F=(0,e.useMemo)(()=>(0,P.QC)(B),[B]);(0,e.useEffect)(()=>{F(z(a))},[F,a]);const N=!!b.length,j=W===u.Gu.Done;return e.createElement(h.a,{className:T.modal,title:"Delete library panel",icon:"trash-alt",onDismiss:s,isOpen:!0},j?null:e.createElement(y,null),j?e.createElement("div",null,N?e.createElement(L,{dashboardTitles:b}):null,N?null:e.createElement(O,null),e.createElement(h.a.ButtonRow,null,e.createElement(f.$n,{variant:"secondary",onClick:s,fill:"outline"},"Cancel"),e.createElement(f.$n,{variant:"destructive",onClick:c,disabled:N},"Delete"))):null)},y=()=>e.createElement("span",null,"Loading library panel..."),O=()=>{const a=(0,D.of)(p.o);return e.createElement("div",{className:a.modalText},"Do you want to delete this panel?")},L=({dashboardTitles:a})=>{const s=(0,D.of)(p.o),c=a.length===1?"dashboard.":"dashboards.",T=`${a.length} ${c}`;return a.length===0?null:e.createElement("div",null,e.createElement("p",{className:s.textInfo},"This library panel can not be deleted because it is connected to ",e.createElement("strong",null,T)," Remove the library panel from the dashboards listed below and retry."),e.createElement("table",{className:s.myTable},e.createElement("thead",null,e.createElement("tr",null,e.createElement("th",null,"Dashboard name"))),e.createElement("tbody",null,a.map((b,W)=>e.createElement("tr",{key:`dash-title-${W}`},e.createElement("td",null,b))))))},K=({libraryPanel:a,onClick:s,onDelete:c,showSecondaryActions:T})=>{const[b,W]=(0,e.useState)(!1),B=()=>{c?.(a),W(!1)},F=I.$.panels[a.model.type]??(0,m.$)(a.model.type).meta;return e.createElement(e.Fragment,null,e.createElement(g.b,{isCurrent:!1,title:a.name,description:a.description,plugin:F,onClick:()=>s?.(a),onDelete:T?()=>W(!0):void 0},e.createElement(v,{libraryPanel:a})),b&&e.createElement(r,{libraryPanel:a,onConfirm:B,onDismiss:()=>W(!1)}))},n=({showSecondaryActions:a,rootProps:s})=>{const c=(0,D.of)(C);return e.createElement(g.b.Skeleton,{hasDelete:a,...s},e.createElement(o.A,{containerClassName:c.metaContainer,width:80}))},E=(0,d.j)(K,n);function v({libraryPanel:a}){const s=(0,D.of)(C);return!a.meta?.folderUid&&!a.meta?.folderName?null:a.meta.folderUid?e.createElement("span",{className:s.metaContainer},e.createElement($.N,{href:`/dashboards/f/${a.meta.folderUid}`},e.createElement(x.I,{name:"folder-upload",size:"sm"}),e.createElement("span",null,a.meta.folderName))):e.createElement("span",{className:s.metaContainer},e.createElement(x.I,{name:"folder",size:"sm"}),e.createElement("span",null,a.meta.folderName))}function C(a){return{metaContainer:(0,l.css)({display:"flex",alignItems:"center",color:a.colors.text.secondary,fontSize:a.typography.bodySmall.fontSize,paddingTop:a.spacing(.5),svg:{marginRight:a.spacing(.5),marginBottom:3}})}}},16678:(_,R,t)=>{t.d(R,{j:()=>y,s:()=>r});var l=t(32196),e=t(96540),o=t(40996),I=t(40845),D=t(66864),x=t(67647),$=t(76459),d=t.n($),m=t(55852),g=t(88323),u=t(14578),h=t(27677),f=t(64161),p=t(80348);function P({onChange:n,maxMenuHeight:E}){const v=(0,I.of)(M),[C,a]=(0,e.useState)(!1),s=(0,e.useCallback)(B=>A(B,a),[]),c=(0,e.useMemo)(()=>d()(s,300),[s]),[T,b]=(0,e.useState)([]),W=(0,e.useCallback)(B=>{const F=B.filter(N=>!!N.value).map(N=>N.value);n(F),b(B)},[n]);return e.createElement("div",{className:v.container},T.length>0&&e.createElement(m.$n,{size:"xs",icon:"trash-alt",fill:"text",className:v.clear,onClick:()=>n([]),"aria-label":"Clear folders"},"Clear folders"),e.createElement(g.Iv,{value:T,onChange:W,isLoading:C,loadOptions:c,maxMenuHeight:E,placeholder:"Filter by folder",noOptionsMessage:"No folders found",prefix:e.createElement(u.I,{name:"filter"}),"aria-label":"Folder filter",defaultOptions:!0}))}async function A(n,E){E(!0);const v={query:n,type:f.G.DashFolder,permission:p.PermissionLevelString.View},a=(await(0,h.AI)().search(v)).map(s=>({label:s.title,value:{uid:s.uid,title:s.title}}));return(!n||"general".includes(n.toLowerCase()))&&a.unshift({label:"General",value:{uid:"general",title:"General"}}),E(!1),a}function M(n){return{container:(0,l.css)({label:"container",position:"relative",minWidth:"180px",flexGrow:1}),clear:(0,l.css)({label:"clear",fontSize:n.spacing(1.5),position:"absolute",top:-n.spacing(4.5),right:0})}}var U=t(68313),i=t(73725),S=t(15054),z=t(83791),r=(n=>(n.Tight="tight",n.Spacious="spacious",n))(r||{});const y=({onClick:n,variant:E="spacious",currentPanelId:v,currentFolderUID:C,perPage:a=S.FG,showPanelFilter:s=!1,showFolderFilter:c=!1,showSort:T=!1,showSecondaryActions:b=!1})=>{const W=(0,I.of)(O,E),[B,F]=(0,e.useState)(""),[N,j]=(0,e.useState)("");(0,o.A)(()=>j(B),200,[B]);const[V,G]=(0,e.useState)({}),[Q,H]=(0,e.useState)(C?[C]:[]),[X,Z]=(0,e.useState)([]),J=T||s||c,Y=E==="tight"?"lg":"xs";return e.createElement("div",{className:W.container},e.createElement(D.gW,{spacing:Y},e.createElement("div",{className:W.gridContainer},e.createElement("div",{className:W.filterInputWrapper},e.createElement(x.Z,{value:B,onChange:F,placeholder:"Search by name or description",width:0,escapeRegex:!1})),J&&e.createElement(L,{showSort:T,showPanelFilter:s,showFolderFilter:c,onSortChange:G,onFolderFilterChange:H,onPanelFilterChange:Z,sortDirection:V.value,variant:E})),e.createElement("div",{className:W.libraryPanelsView},e.createElement(z.y,{onClickCard:n,searchString:N,sortDirection:V.value,panelFilter:X,folderFilter:Q,currentPanelId:v,showSecondaryActions:b,perPage:a}))))};function O(n,E){const v=(0,l.css)`
    flex-direction: row;
    row-gap: ${n.spacing(1)};
  `;return{filterInputWrapper:(0,l.css)`
      flex-grow: ${E==="tight"?1:"initial"};
    `,container:(0,l.css)`
      width: 100%;
      overflow-y: auto;
      padding: ${n.spacing(1)};
    `,libraryPanelsView:(0,l.css)`
      width: 100%;
    `,gridContainer:(0,l.css)`
      ${E==="tight"?v:""};
      display: flex;
      flex-direction: column;
      width: 100%;
      column-gap: ${n.spacing(1)};
      row-gap: ${n.spacing(1)};
      padding-bottom: ${n.spacing(2)};
    `}}const L=e.memo(({variant:n="spacious",showSort:E,showPanelFilter:v,showFolderFilter:C,sortDirection:a,onSortChange:s,onFolderFilterChange:c,onPanelFilterChange:T})=>{const b=(0,I.of)(K,n),W=(0,e.useCallback)(F=>T(F.map(N=>N.id)),[T]),B=(0,e.useCallback)(F=>c(F.map(N=>N.uid??"")),[c]);return e.createElement("div",{className:b.container},E&&e.createElement(i.r,{value:a,onChange:s,filter:["alpha-asc","alpha-desc"]}),(C||v)&&e.createElement("div",{className:b.filterContainer},C&&e.createElement(P,{onChange:B}),v&&e.createElement(U.$,{onChange:W})))});L.displayName="SearchControls";function K(n,E="spacious"){const v=(0,l.css)`
    display: flex;
    gap: ${n.spacing(1)};
    flex-grow: 1;
    flex-direction: row;
    justify-content: end;
  `,C=(0,l.css)`
    ${v};
    flex-grow: initial;
    flex-direction: column;
    justify-content: normal;
  `,a=(0,l.css)`
    display: flex;
    flex-direction: row;
    margin-left: auto;
    gap: 4px;
  `,s=(0,l.css)`
    ${a};
    flex-direction: column;
    margin-left: initial;
  `;switch(E){case"spacious":return{container:v,filterContainer:a};case"tight":return{container:C,filterContainer:s}}}},83791:(_,R,t)=>{t.d(R,{y:()=>u});var l=t(32196),e=t(96540),o=t(40996),I=t(39070),D=t(40845),x=t(67061),$=t(19384),d=t(86474),m=t(38928),g=t(8184);const u=({onClickCard:f,searchString:p,sortDirection:P,panelFilter:A,folderFilter:M,showSecondaryActions:U,currentPanelId:i,perPage:S=40,isWidget:z})=>{const r=(0,D.of)(h),[{libraryPanels:y,page:O,perPage:L,numberOfPages:K,loadingState:n,currentPanelId:E},v]=(0,e.useReducer)(g.w_,{...g.Xb,currentPanelId:i,perPage:S}),C=(0,e.useMemo)(()=>(0,m.QC)(v),[v]);(0,o.A)(()=>C((0,m.IF)({searchString:p,sortDirection:P,panelFilter:A,folderFilterUIDs:M,page:O,perPage:L,currentPanelId:E,isWidget:z})),300,[p,P,A,M,O,C]);const a=({uid:c})=>C((0,m.h4)(c,{searchString:p,sortDirection:P,panelFilter:A,folderFilterUIDs:M,page:O,perPage:L})),s=c=>C((0,g.yd)({page:c}));return e.createElement(x.B,{direction:"column",wrap:"nowrap"},n===I.Gu.Loading?e.createElement(e.Fragment,null,e.createElement(d.E.Skeleton,{showSecondaryActions:U}),e.createElement(d.E.Skeleton,{showSecondaryActions:U}),e.createElement(d.E.Skeleton,{showSecondaryActions:U})):y.length<1?e.createElement("p",{className:r.noPanelsFound},"No library panels found."):y?.map((c,T)=>e.createElement(d.E,{key:`library-panel=${T}`,libraryPanel:c,onDelete:a,onClick:f,showSecondaryActions:U})),y.length?e.createElement("div",{className:r.pagination},e.createElement($.d,{currentPage:O,numberOfPages:K,onNavigate:s,hideWhenSinglePage:!0})):null)},h=f=>({pagination:(0,l.css)({alignSelf:"center",marginTop:f.spacing(1)}),noPanelsFound:(0,l.css)({label:"noPanelsFound",minHeight:200})})},38928:(_,R,t)=>{t.d(R,{IF:()=>A,QC:()=>U,h4:()=>M});var l=t(64423),e=t(65474),o=t(62467),I=t(44240),D=t(39697),x=t(69862),$=t(66847),d=t(69850),m=t(1005),g=t(65961),u=t(67791),h=t(32264),f=t(17706),p=t(57767),P=t(8184);function A(i){const S=(r,y)=>r.id===y.type,z=(r,y)=>{const O=(0,f.A4)();return r.filter(L=>{const K=O.find(n=>S(n,L));return y?!!K?.skipDataQuery:!K?.skipDataQuery})};return function(r){const y=new l.yU,O=(0,e.H)((0,p.dq)({searchString:i.searchString,perPage:i.perPage,page:i.page,excludeUid:i.currentPanelId,sortDirection:i.sortDirection,typeFilter:i.panelFilter,folderFilterUIDs:i.folderFilterUIDs})).pipe((0,x.Z)(L=>{const{elements:K}=L;if(h.$.featureToggles.vizAndWidgetSplit&&i.isWidget!==void 0){const n=z(K,i.isWidget);return(0,o.of)({...L,elements:n})}return(0,o.of)({...L,elements:K})}),(0,x.Z)(({perPage:L,elements:K,page:n,totalCount:E})=>(0,o.of)((0,P.c4)({libraryPanels:K,page:n,perPage:L,totalCount:E}))),(0,$.W)(L=>(console.error(L),(0,o.of)((0,P.c4)({...P.Xb,page:i.page,perPage:i.perPage})))),(0,d.j)(()=>y.unsubscribe()),(0,m.u)());y.add((0,I.h)((0,D.O)(50).pipe((0,g.u)((0,P.d9)()),(0,u.Q)(O)),O).subscribe(r))}}function M(i,S){return async function(z){try{await(0,p.h4)(i),A(S)(z)}catch(r){console.error(r)}}}function U(i){return function(S){return S instanceof Function?S(i):i(S)}}},8184:(_,R,t)=>{t.d(R,{Xb:()=>o,c4:()=>D,d9:()=>I,w_:()=>$,yd:()=>x});var l=t(30038),e=t(39070);const o={loadingState:e.Gu.Loading,libraryPanels:[],totalCount:0,perPage:40,page:1,numberOfPages:0,currentPanelId:void 0},I=(0,l.VP)("libraryPanels/view/initSearch"),D=(0,l.VP)("libraryPanels/view/searchCompleted"),x=(0,l.VP)("libraryPanels/view/changePage"),$=(d,m)=>{if(I.match(m))return{...d,loadingState:e.Gu.Loading};if(D.match(m)){const{libraryPanels:g,page:u,perPage:h,totalCount:f}=m.payload,p=Math.ceil(f/h);return{...d,libraryPanels:g,perPage:h,totalCount:f,loadingState:e.Gu.Done,numberOfPages:p,page:u>p?u-1:u}}return x.match(m)?{...d,page:m.payload.page}:d}},43535:(_,R,t)=>{t.d(R,{o:()=>e});var l=t(32196);function e(o){return{myTable:(0,l.css)`
      max-height: 204px;
      overflow-y: auto;
      margin-top: 11px;
      margin-bottom: 28px;
      border-radius: ${o.shape.radius.default};
      border: 1px solid ${o.colors.action.hover};
      background: ${o.colors.background.primary};
      color: ${o.colors.text.secondary};
      font-size: ${o.typography.h6.fontSize};
      width: 100%;

      thead {
        color: #538ade;
        font-size: ${o.typography.bodySmall.fontSize};
      }

      th,
      td {
        padding: 6px 13px;
        height: ${o.spacing(4)};
      }

      tbody > tr:nth-child(odd) {
        background: ${o.colors.background.secondary};
      }
    `,noteTextbox:(0,l.css)`
      margin-bottom: ${o.spacing(4)};
    `,textInfo:(0,l.css)`
      color: ${o.colors.text.secondary};
      font-size: ${o.typography.size.sm};
    `,dashboardSearch:(0,l.css)`
      margin-top: ${o.spacing(2)};
    `,modal:(0,l.css)`
      width: 500px;
    `,modalText:(0,l.css)`
      font-size: ${o.typography.h4.fontSize};
      color: ${o.colors.text.primary};
      margin-bottom: ${o.spacing(4)};
      padding-top: ${o.spacing(2)};
    `}}}}]);

//# sourceMappingURL=6678.a615dbe07b8a3e591e66.js.map