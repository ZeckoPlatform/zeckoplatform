"use strict";(self.webpackChunkgrafana=self.webpackChunkgrafana||[]).push([[21],{90021:(z,g,t)=>{t.r(g),t.d(g,{RuleViewer:()=>L,default:()=>_});var n=t(32196),e=t(96540),m=t(42941),f=t(17172),E=t(40845),d=t(42418),h=t(39558),R=t(67061),x=t(14578),s=t(94753),o=t(66864),u=t(55852),D=t(82762),$=t(29158),C=t(15054),W=t(730),V=t(33225),X=t(57220),N=t(18461),S=t(23662),b=t(69087),c=t(84396),P=t(48205),K=t(99106),v=t(25992),Q=t(147),Y=t(60996),Z=t(52788),G=t(43644);const H=({group:a})=>{const r=a.source_tenants??[];return e.createElement(c.X,{label:"Tenant sources"},e.createElement(e.Fragment,null,r.map(i=>e.createElement("div",{key:i},i))))};var j=t(99938),w=t(41886),J=t(16625),k=t(47207);const M="Could not find data source for rule",F="Could not view rule",p="View rule";function L({match:a}){const r=(0,E.of)(B),[i,ee]=(0,m.A)(!1),T=(0,e.useMemo)(()=>{const O=N.uE(a.params);if(!O)throw new Error("Rule ID is required");return N.qg(O,!0)},[a.params]),{loading:te,error:I,result:l}=(0,W.ZU)({ruleIdentifier:T}),U=(0,V.Hx)(l?.annotations||{});if(!T?.ruleSourceName)return e.createElement(v.r,{title:p},e.createElement(d.F,{title:F},e.createElement("details",{className:r.errorMessage},M)));const y=(0,X.Zw)(T.ruleSourceName);if(te)return e.createElement(v.r,{title:p},e.createElement(h._,{text:"Loading rule..."}));if(I||!y)return e.createElement(d.F,{title:F},e.createElement("details",{className:r.errorMessage},(0,f.NF)(I)?I.message:M,e.createElement("br",null)));if(!l)return e.createElement(v.r,{title:p},e.createElement("span",null,"Rule could not be found."));const A=(0,S.YN)(l.group),ae=(0,S.lT)(l.rulerRule)&&!!l.rulerRule.grafana_alert.provenance;return e.createElement(v.r,{wrapInContent:!1,title:p,renderTitle:()=>e.createElement(R.B,{direction:"row",alignItems:"flex-start",gap:1},e.createElement(x.I,{name:"bell",size:"xl"}),e.createElement(s.E,{variant:"h3"},l.name),e.createElement(J._,{rule:l,isCreating:!1,isDeleting:!1}))},A&&e.createElement(d.F,{severity:"info",title:"This rule is part of a federated rule group."},e.createElement(o.gW,null,"Federated rule groups are currently an experimental feature.",e.createElement(u.$n,{fill:"text",icon:"book"},e.createElement("a",{href:"https://grafana.com/docs/metrics-enterprise/latest/tenant-management/tenant-federation/#cross-tenant-alerting-and-recording-rule-federation"},"Read documentation")))),ae&&e.createElement(P.Yi,{resource:P.hk.AlertRule}),e.createElement(e.Fragment,null,e.createElement(Q.Q,{rule:l,rulesSource:y,isViewMode:!0}),e.createElement("div",{className:r.details},e.createElement("div",{className:r.leftSide},l.promRule&&e.createElement(c.X,{label:"Health",horizontal:!0},e.createElement(w.J,{rule:l.promRule})),!!l.labels&&!!Object.keys(l.labels).length&&e.createElement(c.X,{label:"Labels",horizontal:!0},e.createElement(b.m,{labels:l.labels})),e.createElement(G.z,{rulesSource:y,rule:l,annotations:U}),e.createElement(Y.Z,{annotations:U})),e.createElement("div",{className:r.rightSide},e.createElement(Z.Z,{rule:l,rulesSource:y}),A&&e.createElement(H,{group:l.group}),e.createElement(c.X,{label:"Namespace / Group",className:r.rightSideDetails},(0,K.EL)(l.namespace).name," / ",l.group.name),(0,S.lT)(l.rulerRule)&&e.createElement(q,{rule:l.rulerRule.grafana_alert}))),e.createElement("div",null,e.createElement(c.X,{label:"Matching instances",horizontal:!0},e.createElement(j.s,{rule:l,pagination:{itemsPerPage:C.FG},enableFiltering:!0})))),e.createElement(D.S,{label:"Query & Results",isOpen:i,onToggle:ee,collapsible:!0,className:r.collapse},i&&e.createElement(k.D,{rule:l})))}function q({rule:a}){const r=(0,E.of)(B),i=()=>navigator.clipboard&&navigator.clipboard.writeText(a.uid);return e.createElement(c.X,{label:"Rule UID",childrenWrapperClassName:r.ruleUid},a.uid," ",e.createElement($.K,{name:"copy",onClick:i,tooltip:"Copy rule UID"}))}const B=a=>({errorMessage:(0,n.css)`
      white-space: pre-wrap;
    `,queries:(0,n.css)`
      height: 100%;
      width: 100%;
    `,collapse:(0,n.css)`
      margin-top: ${a.spacing(2)};
      border-color: ${a.colors.border.weak};
      border-radius: ${a.shape.radius.default};
    `,queriesTitle:(0,n.css)`
      padding: ${a.spacing(2,.5)};
      font-size: ${a.typography.h5.fontSize};
      font-weight: ${a.typography.fontWeightBold};
      font-family: ${a.typography.h5.fontFamily};
    `,query:(0,n.css)`
      border-bottom: 1px solid ${a.colors.border.medium};
      padding: ${a.spacing(2)};
    `,queryWarning:(0,n.css)`
      margin: ${a.spacing(4,0)};
    `,title:(0,n.css)`
      font-size: ${a.typography.h4.fontSize};
      font-weight: ${a.typography.fontWeightBold};
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    `,details:(0,n.css)`
      display: flex;
      flex-direction: row;
      gap: ${a.spacing(4)};
    `,leftSide:(0,n.css)`
      flex: 1;
      overflow: hidden;
    `,rightSide:(0,n.css)`
      padding-right: ${a.spacing(3)};

      max-width: 360px;
      word-break: break-all;
      overflow: hidden;
    `,rightSideDetails:(0,n.css)`
      & > div:first-child {
        width: auto;
      }
    `,labels:(0,n.css)`
      justify-content: flex-start;
    `,ruleUid:(0,n.css)`
      display: flex;
      align-items: center;
      gap: ${a.spacing(1)};
    `}),_=L},25992:(z,g,t)=>{t.d(g,{r:()=>d});var n=t(32196),e=t(96540),m=t(40845),f=t(36830);const E={icon:"bell",id:"alert-rule-view"};function d(s){const{wrapInContent:o=!0,children:u,title:D,renderTitle:$}=s,C=(0,m.of)(R);return e.createElement(f.Y,{pageNav:{...E,text:D},renderTitle:$,navId:"alert-list"},e.createElement(f.Y.Contents,null,e.createElement("div",{className:C.content},o?e.createElement(h,{...s}):u)))}function h({children:s,padding:o=2}){const u=(0,m.of)(x(o));return e.createElement("div",{className:u.wrapper},s)}const R=s=>({content:(0,n.css)`
      max-width: ${s.breakpoints.values.xxl}px;
    `}),x=s=>o=>({wrapper:(0,n.css)`
      background: ${o.colors.background.primary};
      border: 1px solid ${o.colors.border.weak};
      border-radius: ${o.shape.radius.default};
      padding: ${o.spacing(s)};
    `})}}]);

//# sourceMappingURL=21.afca69f2d336e287a655.js.map