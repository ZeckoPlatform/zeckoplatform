"use strict";(self.webpackChunkgrafana=self.webpackChunkgrafana||[]).push([[9711],{26928:(k,D,a)=>{a.d(D,{s:()=>E});var n=a(32196),e=a(2543),M=a.n(e),u=a(96540),w=a(40845),f=a(67061),h=a(69613),B=a(32642),S=a(35108);const E=({matchers:c,formatter:v="default"})=>{const y=(0,w.of)(m),x=5,N=(0,e.take)(c,x),O=(0,e.takeRight)(c,c.length-x),W=O.length>0;return u.createElement("span",{"data-testid":"label-matchers"},u.createElement(f.B,{direction:"row",gap:1,alignItems:"center",wrap:"wrap"},N.map(T=>u.createElement(L,{key:(0,e.uniqueId)(),matcher:T,formatter:v})),W&&u.createElement(S.j,{arrow:!0,placement:"top",content:u.createElement(u.Fragment,null,O.map(T=>u.createElement(L,{key:(0,e.uniqueId)(),matcher:T})))},u.createElement("span",null,u.createElement("div",{className:y.metadata},`and ${O.length} more`)))))},L=({matcher:c,formatter:v="default"})=>{const y=(0,w.of)(m);return u.createElement("div",{className:y.matcher(c[0]).wrapper},u.createElement(f.B,{direction:"row",gap:0,alignItems:"baseline"},B.t8[v](c)))},m=c=>({matcher:v=>{const{color:y,borderColor:x}=(0,h.MC)(v);return{wrapper:(0,n.css)`
        color: #fff;
        background: ${y};
        padding: ${c.spacing(.33)} ${c.spacing(.66)};
        font-size: ${c.typography.bodySmall.fontSize};

        border: solid 1px ${x};
        border-radius: ${c.shape.borderRadius(2)};
      `}},metadata:(0,n.css)`
    color: ${c.colors.text.secondary};

    font-size: ${c.typography.bodySmall.fontSize};
    font-weight: ${c.typography.bodySmall.fontWeight};
  `})},39711:(k,D,a)=>{a.r(D),a.d(D,{default:()=>dt});var n=a(32196),e=a(96540),M=a(40845),u=a(42418),w=a(39558),f=a(66602),h=a(87286),B=a(2543),S=a(55127),E=a.n(S),L=a(42941),m=a(55852),c=a(69613),v=a(64149),y=a(98164),x=a(64047),N=a(55196),O=a(26058),W=a(26928);function T(t){return t.path?.length===0}function H(t){const r=new Map;function l(s,d=[]){r.set(s.id,{...s,path:d}),s.routes?.forEach(o=>l(o,[...d,s.id]))}return l(t,[]),r}function z(t){return t.object_matchers?.length===0}function G({route:t,matcherFormatter:r}){const l=(0,M.of)(V);return T(t)?e.createElement("div",{className:l.defaultPolicy},"Default policy"):z(t)?e.createElement("div",{className:l.textMuted},"No matchers"):e.createElement(W.s,{matchers:t.object_matchers??[],formatter:r})}const V=t=>({defaultPolicy:(0,n.css)`
    padding: ${t.spacing(.5)};
    background: ${t.colors.background.secondary};
    width: fit-content;
  `,textMuted:(0,n.css)`
    color: ${t.colors.text.secondary};
  `});var Y=a(37390),U=a(67061),J=a(14578),Q=a(19073),X=a(70383),Z=a(56361),q=a(64853);function _({route:t,routesByIdMap:r,matcherFormatter:l}){const s=(0,M.of)(F),d=t.path?.slice(1)??[],o=[...(0,B.compact)(d.map(i=>r.get(i))),t];return e.createElement("div",{className:s.policyPathWrapper},e.createElement("div",{className:s.defaultPolicy},"Default policy"),o.map((i,g)=>e.createElement("div",{key:i.id},e.createElement("div",{className:s.policyInPath(g,g===o.length-1)},z(i)?e.createElement("div",{className:s.textMuted},"No matchers"):e.createElement(W.s,{matchers:i.object_matchers??[],formatter:l})))))}function tt({onClose:t,route:r,receiver:l,routesByIdMap:s,alertManagerSourceName:d}){const o=(0,M.of)(F),i=T(r);return e.createElement(X.b9,{accessType:"notification",alertmanagerSourceName:d},e.createElement(Y.a,{className:o.detailsModal,isOpen:!0,title:"Routing details",onDismiss:t,onClickBackdrop:t},e.createElement(U.B,{gap:0,direction:"column"},e.createElement("div",{className:(0,n.cx)(o.textMuted,o.marginBottom(2))},"Your alert instances are routed as follows."),e.createElement("div",null,"Notification policy path"),i&&e.createElement("div",{className:o.textMuted},"Default policy"),e.createElement("div",{className:o.separator(1)}),!i&&e.createElement(e.Fragment,null,e.createElement(_,{route:r,routesByIdMap:s,matcherFormatter:(0,y.VE)(d)})),e.createElement("div",{className:o.separator(4)}),e.createElement("div",{className:o.contactPoint},e.createElement(U.B,{gap:1,direction:"row",alignItems:"center"},"Contact point:",e.createElement("span",{className:o.textMuted},l.name)),e.createElement(q._,{actions:[Q.QI.UpdateContactPoint]},e.createElement(U.B,{gap:1,direction:"row",alignItems:"center"},e.createElement("a",{href:(0,Z.nL)(`/alerting/notifications/receivers/${encodeURIComponent(l.name)}/edit`,d),className:o.link,target:"_blank",rel:"noreferrer"},"See details ",e.createElement(J.I,{name:"external-link-alt"}))))),e.createElement("div",{className:o.button},e.createElement(m.$n,{variant:"primary",type:"button",onClick:t},"Close")))))}const F=t=>({textMuted:(0,n.css)`
    color: ${t.colors.text.secondary};
  `,link:(0,n.css)`
    display: block;
    color: ${t.colors.text.link};
  `,button:(0,n.css)`
    justify-content: flex-end;
    display: flex;
  `,detailsModal:(0,n.css)`
    max-width: 560px;
  `,defaultPolicy:(0,n.css)`
    padding: ${t.spacing(.5)};
    background: ${t.colors.background.secondary};
    width: fit-content;
  `,contactPoint:(0,n.css)`
    display: flex;
    flex-direction: row;
    gap: ${t.spacing(1)};
    align-items: center;
    justify-content: space-between;
    margin-bottom: ${t.spacing(1)};
  `,policyPathWrapper:(0,n.css)`
    display: flex;
    flex-direction: column;
    margin-top: ${t.spacing(1)};
  `,separator:r=>(0,n.css)`
    margin-top: ${t.spacing(r)};
  `,marginBottom:r=>(0,n.css)`
    margin-bottom: ${t.spacing(t.spacing(r))};
  `,policyInPath:(r=0,l=!1)=>(0,n.css)`
    margin-left: ${30+r*30}px;
    padding: ${t.spacing(1)};
    margin-top: ${t.spacing(1)};
    border: solid 1px ${t.colors.border.weak};
    background: ${t.colors.background.secondary};
    width: fit-content;
    position: relative;

    ${l&&(0,n.css)`
        border: solid 1px ${t.colors.info.border};
      `},
    &:before {
      content: '';
      position: absolute;
      height: calc(100% - 10px);
      width: ${t.spacing(1)};
      border-left: solid 1px ${t.colors.border.weak};
      border-bottom: solid 1px ${t.colors.border.weak};
      margin-top: ${t.spacing(-2)};
      margin-left: -17px;
    }
  }  `});function et({route:t,receiver:r,routesByIdMap:l,instancesCount:s,alertManagerSourceName:d,expandRoute:o,onExpandRouteClick:i}){const g=(0,M.of)(K),[C,b]=(0,e.useState)(!1),I=()=>{b(!0)};return e.createElement("div",{className:g.routeHeader},e.createElement(x.e,{isCollapsed:!o,onToggle:R=>i(!R),"aria-label":"Expand policy route"}),e.createElement(h.B,{flexGrow:1,gap:1},e.createElement("div",{onClick:()=>i(!o),className:g.expandable},e.createElement(h.B,{gap:1,direction:"row",alignItems:"center"},"Notification policy",e.createElement(G,{route:t,matcherFormatter:(0,y.VE)(d)}))),e.createElement(O.h,null),e.createElement(h.B,{gap:2,direction:"row",alignItems:"center"},e.createElement(N.P,{icon:"layers-alt","data-testid":"matching-instances"},s??"-",e.createElement("span",null,E()("instance",s))),e.createElement(h.B,{gap:1,direction:"row",alignItems:"center"},e.createElement("div",null,e.createElement("span",{className:g.textMuted},"@ Delivered to")," ",r.name),e.createElement("div",{className:g.verticalBar}),e.createElement(m.$n,{type:"button",onClick:I,variant:"secondary",fill:"outline",size:"sm"},"See details")))),C&&e.createElement(tt,{onClose:()=>b(!1),route:t,receiver:r,routesByIdMap:l,alertManagerSourceName:d}))}function at({route:t,instanceMatches:r,receiver:l,routesByIdMap:s,alertManagerSourceName:d}){const o=(0,M.of)(K),[i,g]=(0,L.A)(!1),C=9;return e.createElement("div",{"data-testid":"matching-policy-route"},e.createElement(et,{route:t,receiver:l,routesByIdMap:s,instancesCount:r.length,alertManagerSourceName:d,expandRoute:i,onExpandRouteClick:g}),i&&e.createElement(h.B,{gap:1,direction:"column"},e.createElement("div",{className:o.routeInstances,"data-testid":"route-matching-instance"},r.map(b=>{const I=Array.from(b.labelsMatch);let R=I.map(([p,P])=>({label:`${p[0]}=${p[1]}`,match:P.match,colorIndex:P.match?(0,c.JF)(p[0]):C}));const $=R.filter(p=>p.match),A=R.filter(p=>!p.match);return e.createElement("div",{className:o.tagListCard,key:(0,B.uniqueId)()},I.length>0?e.createElement(e.Fragment,null,$.length>0?e.createElement(v.L,{tags:$.map(p=>p.label),className:o.labelList,getColorIndex:(p,P)=>$[P].colorIndex}):e.createElement("div",{className:(0,n.cx)(o.textMuted,o.textItalic)},"No matching labels"),e.createElement("div",{className:o.labelSeparator}),e.createElement(v.L,{tags:A.map(p=>p.label),className:o.labelList,getColorIndex:(p,P)=>A[P].colorIndex})):e.createElement("div",{className:o.textMuted},"No labels"))}))))}const K=t=>({textMuted:(0,n.css)`
    color: ${t.colors.text.secondary};
  `,textItalic:(0,n.css)`
    font-style: italic;
  `,expandable:(0,n.css)`
    cursor: pointer;
  `,routeHeader:(0,n.css)`
    display: flex;
    flex-direction: row;
    gap: ${t.spacing(1)};
    align-items: center;
    border-bottom: 1px solid ${t.colors.border.weak};
    &:hover {
      background-color: ${t.components.table.rowHoverBackground};
    }
    padding: ${t.spacing(.5,.5,.5,0)};
  `,labelList:(0,n.css)`
    flex: 0 1 auto;
    justify-content: flex-start;
  `,labelSeparator:(0,n.css)`
    width: 1px;
    background-color: ${t.colors.border.weak};
  `,tagListCard:(0,n.css)`
    display: flex;
    flex-direction: row;
    gap: ${t.spacing(2)};

    position: relative;
    background: ${t.colors.background.secondary};
    padding: ${t.spacing(1)};

    border-radius: ${t.shape.borderRadius(2)};
    border: solid 1px ${t.colors.border.weak};
  `,routeInstances:(0,n.css)`
    padding: ${t.spacing(1,0,1,4)};
    position: relative;

    display: flex;
    flex-direction: column;
    gap: ${t.spacing(1)};

    &:before {
      content: '';
      position: absolute;
      left: ${t.spacing(2)};
      height: calc(100% - ${t.spacing(2)});
      width: ${t.spacing(4)};
      border-left: solid 1px ${t.colors.border.weak};
    }
  `,verticalBar:(0,n.css)`
    width: 1px;
    height: 20px;
    background-color: ${t.colors.secondary.main};
    margin-left: ${t.spacing(1)};
    margin-right: ${t.spacing(1)};
  `});var nt=a(16817),ot=a(51488),rt=a(19143),st=a(79657),ct=a(57220),j=a(79581);const lt=(t,r)=>{const{currentData:l,isLoading:s,error:d}=(0,ot.f)(t),o=l?.alertmanager_config,{matchInstancesToRoute:i}=(0,rt.L)(),{rootRoute:g,receivers:C}=(0,e.useMemo)(()=>o?{rootRoute:o.route?(0,j.rJ)((0,st.QM)(o.route)):void 0,receivers:o.receivers??[]}:{receivers:[],rootRoute:void 0},[o]),b=g?H((0,j._I)(g)):new Map,I=C.reduce((p,P)=>p.set(P.name,P),new Map)??new Map,{value:R=new Map,loading:$,error:A}=(0,nt.A)(async()=>{if(g)return await i(g,r,{unquoteMatchers:t!==ct.hY})},[g,r]);return{routesByIdMap:b,receiversByName:I,matchingMap:R,loading:s||$,error:d??A}};function it({alertManagerSource:t,potentialInstances:r,onlyOneAM:l}){const s=(0,M.of)(gt),{routesByIdMap:d,receiversByName:o,matchingMap:i,loading:g,error:C}=lt(t.name,r);return C?e.createElement(u.F,{title:"Cannot load Alertmanager configuration",severity:"error"},C.message):g?e.createElement(w._,{text:"Loading routing preview..."}):i.size>0?e.createElement("div",{className:s.alertManagerRow},!l&&e.createElement(h.B,{direction:"row",alignItems:"center"},e.createElement("div",{className:s.firstAlertManagerLine}),e.createElement("div",{className:s.alertManagerName}," ","Alert manager:",e.createElement("img",{src:t.imgUrl,alt:"",className:s.img}),t.name),e.createElement("div",{className:s.secondAlertManagerLine})),e.createElement(h.B,{gap:1,direction:"column"},Array.from(i.entries()).map(([I,R])=>{const $=d.get(I),A=$?.receiver&&o.get($.receiver);if(!$)return null;if(!A)throw new Error("Receiver not found");return e.createElement(at,{instanceMatches:R,route:$,receiver:A,key:I,routesByIdMap:d,alertManagerSourceName:t.name})}))):null}const dt=(0,f.Xc)(it),gt=t=>({alertManagerRow:(0,n.css)`
    display: flex;
    flex-direction: column;
    gap: ${t.spacing(1)};
    width: 100%;
  `,firstAlertManagerLine:(0,n.css)`
    height: 1px;
    width: ${t.spacing(4)};
    background-color: ${t.colors.secondary.main};
  `,alertManagerName:(0,n.css)`
    width: fit-content;
  `,secondAlertManagerLine:(0,n.css)`
    height: 1px;
    width: 100%;
    flex: 1;
    background-color: ${t.colors.secondary.main};
  `,img:(0,n.css)`
    margin-left: ${t.spacing(2)};
    width: ${t.spacing(3)};
    height: ${t.spacing(3)};
    margin-right: ${t.spacing(1)};
  `})},19143:(k,D,a)=>{a.d(D,{L:()=>S});var n=a(14590),e=a(96540),M=a(25027),u=a(67278);const w=()=>new u.c(new URL(a.p+a.u(5398),a.b));let f;function h(){let E;if(f===void 0)try{E=w(),f=n.LV(E)}catch(m){m instanceof Error&&(0,M.vV)(m)}return{disposeWorker:()=>{E&&f&&(f[n.A2](),E.terminate(),f=void 0,E=void 0)}}}function B(E){if(!f)throw new Error("Route Matcher has not been initialized")}function S(){(0,e.useEffect)(()=>{const{disposeWorker:m}=h();return m},[]);const E=(0,e.useCallback)(async(m,c,v)=>{B(f);const y=performance.now(),x=await f.getRouteGroupsMap(m,c,v),N=performance.now()-y;return(0,M.fH)(`Route Groups Matched in  ${N} ms`,{matchingTime:N.toString(),alertGroupsCount:c.length.toString(),topLevelRoutesCount:m.routes?.length.toString()??"0"}),x},[]),L=(0,e.useCallback)(async(m,c,v)=>{B(f);const y=performance.now(),x=await f.matchInstancesToRoute(m,c,v),N=performance.now()-y;return(0,M.fH)(`Instances Matched in  ${N} ms`,{matchingTime:N.toString(),instancesToMatchCount:c.length.toString(),topLevelRoutesCount:m.routes?.length.toString()??"0"}),x},[]);return{getRouteGroupsMap:E,matchInstancesToRoute:L}}}}]);

//# sourceMappingURL=9711.d6e977bd60f0e5ba673d.js.map