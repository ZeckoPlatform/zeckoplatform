"use strict";(self.webpackChunkgrafana=self.webpackChunkgrafana||[]).push([[5761],{53371:(H,P,e)=>{e.r(P),e.d(P,{ListPublicDashboardPage:()=>$,default:()=>Y});var t=e(96540),r=e(32196),C=e(49045),S=e(13544),U=e(14110),f=e(40845),v=e(10860),N=e(56034),A=e(14578),I=e(15292),E=e(55852),x=e(62930),B=e(66864),R=e(19384),D=e(36830),i=e(44836),z=e(16233),y=e(72686),L=e(72254),M=e(80348),Z=e(71678),O=e(90591);const W=({dashboard:a,publicDashboard:s,loader:l,children:n,onDismiss:d,...h})=>{const[o,{isLoading:c}]=(0,y.bN)(),b=(u,g)=>{o({dashboard:a,uid:u.uid,dashboardUid:u.dashboardUid}),g()};return t.createElement(Z.$s,null,({showModal:u,hideModal:g})=>{const m=(0,i.t)("public-dashboard-list.button.revoke-button-text","Revoke public URL");return t.createElement(E.$n,{"aria-label":m,title:m,onClick:()=>u(O.m,{dashboardTitle:s.title,onConfirm:()=>b(s,g),onDismiss:()=>{d?d():g()}}),...h},c&&l?l:n)})},j=({pd:a})=>{const s=(0,f.of)(T),l=(0,f.$j)(),n=(0,C.A)(`(max-width: ${l.breakpoints.values.sm}px)`),[d,{isLoading:h}]=(0,y.T2)(),o=S.Tp.pages.PublicDashboards,c=z.TP.hasPermission(M.AccessControlAction.DashboardsPublicWrite),b=!a.dashboardUid,u=(p,F)=>{const G={dashboard:{uid:p.dashboardUid},payload:{uid:p.uid,isEnabled:!F}};d(G)},g=(0,t.useMemo)(()=>n?v.Z.Actions:v.Z.SecondaryActions,[n]),m=(0,i.t)("public-dashboard-list.toggle.pause-sharing-toggle-text","Pause sharing");return t.createElement(v.Z,{className:s.card,href:b?void 0:`/d/${a.dashboardUid}`},t.createElement(v.Z.Heading,{className:s.heading},b?t.createElement(N.m,{content:(0,i.t)("public-dashboard-list.dashboard-title.orphaned-tooltip","The linked dashboard has already been deleted"),placement:"top"},t.createElement("div",{className:s.orphanedTitle},t.createElement(i.x6,{i18nKey:"public-dashboard-list.dashboard-title.orphaned-title"},t.createElement("span",null,"Orphaned public dashboard")),t.createElement(A.I,{name:"info-circle"}))):t.createElement("span",null,a.title)),t.createElement(g,{className:s.actions},t.createElement("div",{className:s.pauseSwitch},t.createElement(I.d,{value:!a.isEnabled,label:m,disabled:h,onChange:p=>{(0,U.rR)("grafana_dashboards_public_enable_clicked",{action:p.currentTarget.checked?"disable":"enable"}),u(a,p.currentTarget.checked)},"data-testid":o.ListItem.pauseSwitch}),t.createElement("span",null,m)),t.createElement(E.z9,{disabled:b,fill:"text",icon:"external-link-alt",variant:"secondary",target:"_blank",color:l.colors.warning.text,href:(0,L.mL)(a.accessToken),key:"public-dashboard-url",tooltip:(0,i.t)("public-dashboard-list.button.view-button-tooltip","View public dashboard"),"data-testid":o.ListItem.linkButton}),t.createElement(E.z9,{disabled:b,fill:"text",icon:"cog",variant:"secondary",color:l.colors.warning.text,href:(0,L.gN)(a.dashboardUid,a.slug),key:"public-dashboard-config-url",tooltip:(0,i.t)("public-dashboard-list.button.config-button-tooltip","Configure public dashboard"),"data-testid":o.ListItem.configButton}),c&&t.createElement(W,{fill:"text",icon:"trash-alt",variant:"secondary",publicDashboard:a,tooltip:(0,i.t)("public-dashboard-list.button.revoke-button-tooltip","Revoke public dashboard URL"),loader:t.createElement(x.y,null),"data-testid":o.ListItem.trashcanButton})))},k=()=>{const[a,s]=(0,t.useState)(1),l=(0,f.of)(T),{data:n,isLoading:d,isFetching:h,isError:o}=(0,y._e)(a);return t.createElement(D.Y,{navId:"dashboards/public",actions:h&&t.createElement(x.y,null)},t.createElement(D.Y.Contents,{isLoading:d},!d&&!o&&!!n&&t.createElement("div",null,t.createElement("ul",{className:l.list},n.publicDashboards.map(c=>t.createElement("li",{key:c.uid},t.createElement(j,{pd:c})))),t.createElement(B.Gy,{justify:"flex-end"},t.createElement(R.d,{onNavigate:s,currentPage:n.page,numberOfPages:n.totalPages,hideWhenSinglePage:!0})))))},T=a=>({list:(0,r.css)`
    list-style-type: none;
    margin-bottom: ${a.spacing(2)};
  `,card:(0,r.css)`
    ${a.breakpoints.up("sm")} {
      display: flex;
    }
  `,heading:(0,r.css)`
    display: flex;
    align-items: center;
    gap: ${a.spacing(1)};
    flex: 1;
  `,orphanedTitle:(0,r.css)`
    display: flex;
    align-items: center;
    gap: ${a.spacing(1)};
  `,actions:(0,r.css)`
    display: flex;
    align-items: center;
    position: relative;

    gap: ${a.spacing(.5)};
    ${a.breakpoints.up("sm")} {
      gap: ${a.spacing(1)};
    }
  `,pauseSwitch:(0,r.css)`
    display: flex;
    gap: ${a.spacing(1)};
    align-items: center;
    font-size: ${a.typography.bodySmall.fontSize};
    margin-bottom: 0;
    flex: 1;

    ${a.breakpoints.up("sm")} {
      padding-right: ${a.spacing(2)};
    }
  `}),$=({})=>t.createElement(k,null),Y=$}}]);

//# sourceMappingURL=ListPublicDashboardPage.469a693c4011a5193fcd.js.map