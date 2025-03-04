"use strict";(self.webpackChunkgrafana=self.webpackChunkgrafana||[]).push([[7197],{9187:(X,P,a)=>{a.r(P),a.d(P,{default:()=>W});var s=a(32196),t=a(96540),T=a(84596),A=a(64388),x=a(13544),C=a(95247),l=a(40845),R=a(36830),F=a(76888),G=a(81862),h=a(80348),S=a(62367),O=a(59757),U=a(9980);const z="https://grafana.com/?src=grafananet&cnt=public-dashboards",H="public/img/grafana_text_logo_light.svg",$="public/img/grafana_text_logo_dark.svg",E="grafana-logo",L=e=>{const o=(0,l.$j)(),i=(0,l.of)(j),{footerHide:n,footerText:d,footerLink:y,footerLogo:c,headerLogoHide:p}=e||{footerHide:!1,footerText:"Powered by",footerLogo:E,footerLink:z,headerLogoHide:!1};return{footerHide:n,footerText:t.createElement("span",{className:i.text},d),footerLogo:c===E?o.isDark?H:$:c,footerLink:y,headerLogoHide:p}};let u=()=>L();function w(e){u=()=>L(e)}const j=e=>({text:(0,s.css)({color:e.colors.text.secondary,fontSize:e.typography.body.fontSize})}),B=function(){const e=(0,l.of)(I),o=u();return o.footerHide?null:t.createElement("div",{className:e.footer},t.createElement("a",{className:e.link,href:o.footerLink,target:"_blank",rel:"noreferrer noopener"},o.footerText," ",t.createElement("img",{className:e.logoImg,alt:"",src:o.footerLogo})))},I=e=>({footer:(0,s.css)({display:"flex",justifyContent:"end",height:"30px",padding:e.spacing(0,2,0,1)}),link:(0,s.css)({display:"flex",alignItems:"center"}),logoImg:(0,s.css)({height:"16px",marginLeft:e.spacing(.5)})});var b=a(19361),M=a(20851);const v=x.Tp.pages.PublicDashboard.NotAvailable,D=({paused:e})=>{const o=(0,l.of)(k),i=(0,l.of)(M.YO),n=b.M.LoginBoxBackground();return t.createElement(b.M.LoginBackground,{className:o.container,"data-testid":v.container},t.createElement("div",{className:(0,s.cx)(o.box,n)},t.createElement(b.M.LoginLogo,{className:i.loginLogo}),t.createElement("p",{className:o.title,"data-testid":v.title},e?"This dashboard has been paused by the administrator":"The dashboard your are trying to access does not exist"),e&&t.createElement("p",{className:o.description,"data-testid":v.pausedDescription},"Try again later")))},k=e=>({container:(0,s.css)`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;

    :before {
      opacity: 1;
    }
  `,box:(0,s.css)`
    width: 608px;
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: ${e.spacing(4)};
    z-index: 1;
    border-radius: ${e.shape.borderRadius(4)};
    padding: ${e.spacing(6,8)};
    opacity: 1;
  `,title:(0,s.css)`
    font-size: ${e.typography.h3.fontSize};
    text-align: center;
    margin: 0;
  `,description:(0,s.css)`
    font-size: ${e.typography.h5.fontSize};
    margin: 0;
  `});var Y=a(2118),N=a(74856),K=a(79999);const V=x.Tp.pages.PublicDashboard,Z=({dashboard:e})=>{const o=(0,h.useDispatch)(),i=u(),n=d=>{o((0,G.Cj)(d))};return t.createElement(C.d,{title:e.title,pageIcon:i.headerLogoHide?void 0:"grafana",buttonOverflowAlignment:"right"},!e.timepicker.hidden&&t.createElement(S.$,{dashboard:e,onChangeTimeZone:n}))},J=e=>{const{match:o,route:i,location:n}=e,d=(0,h.useDispatch)(),y=(0,F.Il)(),c=(0,T.A)(e),p=(0,l.of)(Q),f=(0,h.useSelector)(g=>g.dashboard),r=f.getModel();return(0,t.useEffect)(()=>{d((0,K.vR)({routeName:i.routeName,fixUrl:!1,accessToken:o.params.accessToken,keybindingSrv:y.keybindings}))},[]),(0,t.useEffect)(()=>{if(c?.location.search!==n.search){const g=c?.queryParams,m=e.queryParams;(m?.from!==g?.from||m?.to!==g?.to)&&!r?.timepicker.hidden&&(0,N.jG)().updateTimeRangeFromUrl(),!g?.refresh&&m?.refresh&&(0,N.jG)().setAutoRefresh(m.refresh)}},[c,n.search,e.queryParams,r?.timepicker.hidden]),r?r.meta.publicDashboardEnabled===!1?t.createElement(D,{paused:!0}):r.meta.dashboardNotFound?t.createElement(D,null):t.createElement(R.Y,{pageNav:{text:r.title},layout:A.k.Custom,"data-testid":V.page},t.createElement(Z,{dashboard:r}),f.initError&&t.createElement(O.y,{initError:f.initError}),t.createElement("div",{className:p.gridContainer},t.createElement(Y.N,{dashboard:r,isEditable:!1,viewPanel:null,editPanel:null,hidePanelMenus:!0})),t.createElement(B,null)):t.createElement(U.P,{initPhase:f.initPhase})},Q=e=>({gridContainer:(0,s.css)({flex:1,padding:e.spacing(2,2,2,2),overflow:"auto"})}),W=J}}]);

//# sourceMappingURL=PublicDashboardPage.51c7c24941781e091898.js.map