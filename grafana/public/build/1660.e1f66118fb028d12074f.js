"use strict";(self.webpackChunkgrafana=self.webpackChunkgrafana||[]).push([[1660,1488],{40715:(q,M,a)=>{a.d(M,{o:()=>x});var l=a(96540),n=a(80348),e=a(97007);function x(b){const S=(0,n.useDispatch)(),D=(0,l.useRef)(b);D.current=b,(0,l.useEffect)(()=>()=>{S((0,e.N)({cleanupAction:D.current}))},[S])}},31099:(q,M,a)=>{a.d(M,{A:()=>k});var l=a(32196),n=a(1932),e=a(96540),x=a(49785),b=a(42941),S=a(40845),D=a(67061),P=a(94753),I=a(10354),O=a(21744),U=a(88575),B=a(55852),d=a(55740),W=a(16504);const De=({field:t})=>{const s=(0,S.of)(Ie);return e.createElement("div",null,e.createElement("span",{className:s.annotationTitle},"Custom annotation name and content"),e.createElement(I.p,{placeholder:"Enter custom annotation name...",width:18,...t,className:s.customAnnotationInput}))},Ie=t=>({annotationTitle:(0,l.css)`
    color: ${t.colors.text.primary};
    margin-bottom: 3px;
  `,customAnnotationInput:(0,l.css)`
    margin-top: 5px;
    width: 100%;
  `}),Ce=De,Se=({annotationField:t,annotations:s,annotation:c,index:h})=>{const{control:f}=(0,x.xW)();return e.createElement(D.B,{direction:"column",gap:0},e.createElement("label",null,e.createElement(W.e,{name:`annotations.${h}.key`,defaultValue:t.key,render:({field:{ref:i,...p}})=>{if(!d.J3[c])return e.createElement(Ce,{field:p});let w;switch(t.key){case d.YH.dashboardUID:w="Dashboard and panel";break;case d.YH.panelID:w="";break;default:w=d.J3[c]&&d.J3[c]+" (optional)"}return e.createElement("span",{"data-testid":`annotation-key-${h}`},e.createElement(P.E,{color:"primary",variant:"bodySmall"},w))},control:f,rules:{required:{value:!!s[h]?.value,message:"Required."}}})),e.createElement(P.E,{variant:"bodySmall",color:"secondary"},d.H8[c]))};var H=a(14578),xe=a(56361);const oe=({dashboard:t,panel:s,dashboardUid:c,panelId:h,onEditClick:f,onDeleteClick:i})=>{const p=(0,S.of)(Ae),w=(0,xe.JM)(t?.uid||c),A=(0,xe.D2)(t?.uid||c,s?.id?.toString()||h);return e.createElement("div",{className:p.container},t&&e.createElement("a",{href:w,className:p.link,target:"_blank",rel:"noreferrer","data-testid":"dashboard-annotation"},t.title," ",e.createElement(H.I,{name:"external-link-alt"})),!t&&e.createElement("span",{className:p.noLink},"Dashboard ",c," "),s&&e.createElement("a",{href:A,className:p.link,target:"_blank",rel:"noreferrer","data-testid":"panel-annotation"},s.title||"<No title>"," ",e.createElement(H.I,{name:"external-link-alt"})),!s&&e.createElement("span",{className:p.noLink}," - Panel ",h),(t||s)&&e.createElement(e.Fragment,null,e.createElement(H.I,{name:"pen",onClick:f,className:p.icon}),e.createElement(H.I,{name:"trash-alt",onClick:i,className:p.icon})))},Ae=t=>({container:(0,l.css)`
    margin-top: 5px;
  `,noLink:(0,l.css)`
    color: ${t.colors.text.secondary};
  `,link:(0,l.css)`
    color: ${t.colors.text.link};
    margin-right: ${t.spacing(1.5)};
  `,icon:(0,l.css)`
    margin-right: ${t.spacing(1)};
    cursor: pointer;
  `}),Pe=oe;var se=a(2543),re=a(40996),_=a(70713),ce=a(91793),ie=a(56034),de=a(37390),ee=a(42418),ue=a(67647),o=a(39558),r=a(49962);const C=r.H.injectEndpoints({endpoints:t=>({search:t.query({query:({query:s})=>{const c=new URLSearchParams({type:"dash-db",limit:"1000",page:"1",sort:"name_sort"});return s&&c.set("query",s),{url:`/api/search?${c.toString()}`}}}),dashboard:t.query({query:({uid:s})=>({url:`/api/dashboards/uid/${s}`})})})});var N=a(41811),y=a(34214);const v=(0,N.A)(t=>{const{dashboard:s,meta:c}=structuredClone(t);return new y.G(s,c)});function T(t){return C.endpoints.dashboard.useQuery({uid:t??""},{skip:!t,selectFromResult:({currentData:c,data:h,...f})=>({dashboardModel:c?v(c):void 0,...f})})}function Z(t,s){return t.title&&s.title?t.title.localeCompare(s.title):t.title&&!s.title?1:!t.title&&s.title?-1:0}const $=({dashboardUid:t,panelId:s,isOpen:c,onChange:h,onDismiss:f})=>{const i=(0,S.of)(Y),[p,w]=(0,e.useState)(t),[A,fe]=(0,e.useState)(s),[te,Re]=(0,e.useState)(""),[X,z]=(0,e.useState)(""),[ae,ge]=(0,e.useState)(""),{useSearchQuery:$e}=C,{currentData:G=[],isFetching:J}=$e({query:X}),{dashboardModel:V,isFetching:ne}=T(p),Le=(0,e.useCallback)(E=>{w(E),fe(void 0)},[]),Ee=L(V),ve=Ee.filter(E=>E.title?.toLowerCase().includes(ae.toLowerCase())).sort(Z)??[],u=Ee.find(E=>m(E)&&E.id?.toString()===A),g=(0,e.useMemo)(()=>G.map(E=>E.uid).indexOf(p??""),[G,p]),F=t&&t===p,j=g>=0,Q=(0,e.useCallback)(E=>{const K=g>=0;F&&K&&E?.scrollToItem(g,"smart")},[F,g]);(0,re.A)(()=>{z(te)},500,[te]);const ye=({index:E,style:K})=>{const R=G[E],he=p===R.uid;return e.createElement("button",{type:"button",title:R.title,style:K,className:(0,l.cx)(i.rowButton,{[i.rowOdd]:E%2===1,[i.rowSelected]:he}),onClick:()=>Le(R.uid)},e.createElement("div",{className:(0,l.cx)(i.dashboardTitle,i.rowButtonTitle)},R.title),e.createElement("div",{className:i.dashboardFolder},e.createElement(H.I,{name:"folder"})," ",R.folderTitle??"General"))},le=({index:E,style:K})=>{const R=ve[E],he=R.title||"<No title>",Oe=!!R.id&&A===R.id,Te=R.type==="graph"||R.type==="timeseries",be=!m(R);return e.createElement("button",{type:"button",style:K,disabled:be,className:(0,l.cx)(i.rowButton,i.panelButton,{[i.rowOdd]:E%2===1,[i.rowSelected]:Oe}),onClick:()=>be?se.noop:fe(R.id)},e.createElement("div",{className:i.rowButtonTitle,title:he},he),!Te&&!be&&e.createElement(ie.m,{content:"The alert tab and alert annotations are only supported on graph and timeseries panels."},e.createElement(H.I,{name:"exclamation-triangle",className:i.warnIcon,"data-testid":"warning-icon"})),be&&e.createElement(ie.m,{content:"This panel does not have a valid identifier."},e.createElement(H.I,{name:"info-circle","data-testid":"info-icon"})))};return e.createElement(de.a,{title:"Select dashboard and panel",closeOnEscape:!0,isOpen:c,onDismiss:f,className:i.modal,contentClassName:i.modalContent},!j&&t&&V&&e.createElement(ee.F,{title:"Current selection",severity:"info",topSpacing:0,bottomSpacing:1,className:i.modalAlert},e.createElement("div",null,"Dashboard: ",V.title," (",V.uid,") in folder"," ",V.meta?.folderTitle??"General"),u&&e.createElement("div",null,"Panel: ",u.title," (",u.id,")")),e.createElement("div",{className:i.container},e.createElement(ue.Z,{value:te,onChange:Re,title:"Search dashboard",placeholder:"Search dashboard",autoFocus:!0}),e.createElement(ue.Z,{value:ae,onChange:ge,title:"Search panel",placeholder:"Search panel"}),e.createElement("div",{className:i.column},J&&e.createElement(o._,{text:"Loading dashboards...",className:i.loadingPlaceholder}),!J&&e.createElement(_.Ay,null,({height:E,width:K})=>e.createElement(ce.Y1,{ref:Q,itemSize:50,height:E,width:K,itemCount:G.length},ye))),e.createElement("div",{className:i.column},!p&&!ne&&e.createElement("div",{className:i.selectDashboardPlaceholder},e.createElement("div",null,"Select a dashboard to get a list of available panels")),ne&&e.createElement(o._,{text:"Loading dashboard...",className:i.loadingPlaceholder}),p&&!ne&&e.createElement(_.Ay,null,({width:E,height:K})=>e.createElement(ce.Y1,{itemSize:32,height:K,width:E,itemCount:ve.length},le)))),e.createElement(de.a.ButtonRow,null,e.createElement(B.$n,{type:"button",variant:"secondary",onClick:f,fill:"text"},"Cancel"),e.createElement(B.$n,{type:"button",variant:"primary",disabled:!(p&&A),onClick:()=>{p&&A&&h(p,A)}},"Confirm")))};function L(t){if(!t)return[];const s=t.panels.filter(f=>f.type!=="row"),c=t.panels.filter(f=>f.collapsed).flatMap(f=>f.panels??[]);return[...s,...c]}const m=t=>{const s=typeof t.id=="number",c=typeof t.type=="string",h="libraryPanel"in t;return s&&(c||h)},Y=t=>{const s=(0,B.my)(t);return{container:(0,l.css)`
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: min-content auto;
      gap: ${t.spacing(2)};
      flex: 1;
    `,column:(0,l.css)`
      flex: 1 1 auto;
    `,dashboardTitle:(0,l.css)`
      height: 22px;
      font-weight: ${t.typography.fontWeightBold};
    `,dashboardFolder:(0,l.css)`
      height: 20px;
      font-size: ${t.typography.bodySmall.fontSize};
      color: ${t.colors.text.secondary};
      display: flex;
      flex-direction: row;
      justify-content: flex-start;
      column-gap: ${t.spacing(1)};
      align-items: center;
    `,rowButton:(0,l.css)`
      ${s};
      padding: ${t.spacing(.5)};
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: left;
      white-space: nowrap;
      cursor: pointer;
      border: 2px solid transparent;

      &:disabled {
        cursor: not-allowed;
        color: ${t.colors.text.disabled};
      }
    `,rowButtonTitle:(0,l.css)`
      text-overflow: ellipsis;
      overflow: hidden;
    `,rowSelected:(0,l.css)`
      border-color: ${t.colors.primary.border};
    `,rowOdd:(0,l.css)`
      background-color: ${t.colors.background.secondary};
    `,panelButton:(0,l.css)`
      display: flex;
      gap: ${t.spacing(1)};
      justify-content: space-between;
      align-items: center;
    `,loadingPlaceholder:(0,l.css)`
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    `,selectDashboardPlaceholder:(0,l.css)`
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      text-align: center;
      font-weight: ${t.typography.fontWeightBold};
    `,modal:(0,l.css)`
      height: 100%;
    `,modalContent:(0,l.css)`
      flex: 1;
      display: flex;
      flex-direction: column;
    `,modalAlert:(0,l.css)`
      flex-grow: 0;
    `,warnIcon:(0,l.css)`
      fill: ${t.colors.warning.main};
    `}};var me=a(64100),Be=a(271);const pe=()=>{const t=(0,S.of)(Ne),[s,c]=(0,b.A)(!1),{control:h,register:f,watch:i,formState:{errors:p},setValue:w}=(0,x.xW)(),A=i("annotations"),{fields:fe,append:te,remove:Re}=(0,x.jz)({control:h,name:"annotations"}),X=A.find(u=>u.key===d.YH.dashboardUID)?.value,z=Number(A.find(u=>u.key===d.YH.panelID)?.value),[ae,ge]=(0,e.useState)(void 0),[$e,G]=(0,e.useState)(void 0),{dashboardModel:J,isFetching:V}=T(X);(0,e.useEffect)(()=>{if(V||!J)return;ge(J);const g=L(J).find(F=>F.id===z);G(g)},[z,J,V]);const ne=(u,g)=>{const F=(0,n.jM)(A,j=>{const Q=j.find(le=>le.key===d.YH.dashboardUID),ye=j.find(le=>le.key===d.YH.panelID);Q?Q.value=u:j.push({key:d.YH.dashboardUID,value:u}),ye?ye.value=g.toString():j.push({key:d.YH.panelID,value:g.toString()})});w("annotations",F),c(!1)},Le=()=>{const u=A.filter(g=>g.key!==d.YH.dashboardUID&&g.key!==d.YH.panelID);w("annotations",u),ge(void 0),G(void 0)},Ee=()=>{c(!0)};function ve(){const u="https://grafana.com/docs/grafana/latest/alerting/fundamentals/annotation-label/variables-label-annotation";return e.createElement(D.B,{direction:"row",gap:.5,alignItems:"baseline"},e.createElement(P.E,{variant:"bodySmall",color:"secondary"},"Add more context in your notification messages."),e.createElement(me.G,{contentText:`Annotations add metadata to provide more information on the alert in your alert notification messages. 
          For example, add a Summary annotation to tell you which value caused the alert to fire or which server it happened on. 
          Annotations can contain a combination of text and template code.`,externalLink:u,linkText:"Read about annotations",title:"Annotations"}))}return e.createElement(Be.P,{stepNo:5,title:"Add annotations",description:ve(),fullWidth:!0},e.createElement(D.B,{direction:"column",gap:1},fe.map((u,g)=>{const F=A[g]?.key?.toLocaleLowerCase().endsWith("url"),j=F?I.p:O.f,Q=u.key;return e.createElement("div",{key:u.id,className:t.flexRow},e.createElement("div",null,e.createElement(Se,{annotationField:u,annotations:A,annotation:Q,index:g}),X&&z&&u.key===d.YH.dashboardUID&&e.createElement(Pe,{dashboard:ae,panel:$e,dashboardUid:X.toString(),panelId:z.toString(),onEditClick:Ee,onDeleteClick:Le}),e.createElement("div",{className:t.annotationValueContainer},e.createElement(U.D,{hidden:u.key===d.YH.dashboardUID||u.key===d.YH.panelID,className:(0,l.cx)(t.flexRowItemMargin,t.field),invalid:!!p.annotations?.[g]?.value?.message,error:p.annotations?.[g]?.value?.message},e.createElement(j,{"data-testid":`annotation-value-${g}`,className:(0,l.cx)(t.annotationValueInput,{[t.textarea]:!F}),...f(`annotations.${g}.value`),placeholder:F?"https://":u.key&&`Enter a ${u.key}...`||"Enter custom annotation content...",defaultValue:u.value})),!d.J3[Q]&&e.createElement(B.$n,{type:"button",className:t.deleteAnnotationButton,"aria-label":"delete annotation",icon:"trash-alt",variant:"secondary",onClick:()=>Re(g)}))))}),e.createElement(D.B,{direction:"row",gap:1},e.createElement("div",{className:t.addAnnotationsButtonContainer},e.createElement(B.$n,{icon:"plus",type:"button",variant:"secondary",onClick:()=>{te({key:"",value:""})}},"Add custom annotation"),!ae&&e.createElement(B.$n,{type:"button",variant:"secondary",icon:"dashboard",onClick:()=>c(!0)},"Link dashboard and panel"))),s&&e.createElement($,{isOpen:!0,dashboardUid:X,panelId:z,onChange:ne,onDismiss:()=>c(!1)})))},Ne=t=>({annotationValueInput:(0,l.css)`
    width: 394px;
  `,textarea:(0,l.css)`
    height: 76px;
  `,addAnnotationsButtonContainer:(0,l.css)`
    margin-top: ${t.spacing(1)};
    gap: ${t.spacing(1)};
    display: flex;
  `,field:(0,l.css)`
    margin-bottom: ${t.spacing(.5)};
  `,flexRow:(0,l.css)`
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
  `,flexRowItemMargin:(0,l.css)`
    margin-top: ${t.spacing(1)};
  `,deleteAnnotationButton:(0,l.css)`
    display: inline-block;
    margin-top: 10px;
    margin-left: 10px;
  `,annotationTitle:(0,l.css)`
    color: ${t.colors.text.primary};
    margin-bottom: 3px;
  `,annotationContainer:(0,l.css)`
    margin-top: 5px;
  `,annotationDescription:(0,l.css)`
    color: ${t.colors.text.secondary};
  `,annotationValueContainer:(0,l.css)`
    display: flex;
  `}),k=pe},54749:(q,M,a)=>{a.d(M,{A:()=>ue});var l=a(32196),n=a(96540),e=a(49785),x=a(55852),b=a(40845),S=a(39558),D=a(67061),P=a(88575),I=a(16504),O=a(76892),U=a(10354),B=a(94753),d=a(80348),W=a(61410),De=a(23770),Ie=a(88131),Ce=a(88323);const Me=(0,Ie.c)({ignoreCase:!1});function Se(o,r){return Me({label:o.label??"",value:o.value??"",data:{}},r)}const H=(o,r,C)=>{const N=C.some(v=>v.label===o),y=o.trim().length;return!N&&!!y},oe=n.forwardRef(function({onChange:r,options:C,defaultValue:N,type:y,onOpenMenu:v=()=>{}},T){return n.createElement("div",{ref:T},n.createElement(P.D,{disabled:!1,"data-testid":`alertlabel-${y}-picker`},n.createElement(Ce.l6,{placeholder:`Choose ${y}`,width:29,className:"ds-picker select-container",backspaceRemovesValue:!1,onChange:r,onOpenMenu:v,filterOption:Se,isValidNewOption:H,options:C,maxMenuHeight:500,noOptionsMessage:"No labels found",defaultValue:N,allowCustomValue:!0})))});var Ae=a(64100);const Pe=o=>{const r=(0,d.useDispatch)();(0,n.useEffect)(()=>{r((0,De.HB)(o))},[r,o]);const N=(0,W.$)(v=>v.rulerRules)[o],y=(0,n.useMemo)(()=>{const v={},T=N?.result;return T&&Object.values(T).flatMap($=>$).flatMap($=>$.rules).forEach($=>{$.labels&&Object.entries($.labels).forEach(([L,m])=>{if(!m)return;const Y=v[L];Y?Y.add(m):v[L]=new Set([m])})}),v},[N]);return{loading:N?.loading,labelsByKey:y}};function se(o=[]){return Array.from(o,r=>({label:r,value:r}))}const re=({remove:o,className:r,index:C})=>n.createElement(x.$n,{className:r,"aria-label":"delete label",icon:"trash-alt","data-testid":`delete-label-${C}`,variant:"secondary",onClick:()=>{o(C)}}),_=({append:o,className:r})=>n.createElement(x.$n,{className:r,icon:"plus-circle",type:"button",variant:"secondary",onClick:()=>{o({key:"",value:""})}},"Add label"),ce=({dataSourceName:o})=>{const r=(0,b.of)(ee),{control:C,watch:N,formState:{errors:y}}=(0,e.xW)(),v=N("labels"),{fields:T,remove:Z,append:$}=(0,e.jz)({control:C,name:"labels"}),{loading:L,labelsByKey:m}=Pe(o),[Y,me]=(0,n.useState)(""),Be=(0,n.useMemo)(()=>se(Object.keys(m)),[m]),pe=(0,n.useCallback)(k=>se(m[k]),[m]),Ne=(0,n.useMemo)(()=>pe(Y),[Y,pe]);return n.createElement(n.Fragment,null,L&&n.createElement(S._,{text:"Loading"}),!L&&n.createElement(D.B,{direction:"column",gap:.5},T.map((k,t)=>n.createElement("div",{key:k.id},n.createElement("div",{className:(0,l.cx)(r.flexRow,r.centerAlignRow)},n.createElement(P.D,{className:r.labelInput,invalid:!!y.labels?.[t]?.key?.message,error:y.labels?.[t]?.key?.message,"data-testid":`label-key-${t}`},n.createElement(I.e,{name:`labels.${t}.key`,control:C,rules:{required:v[t]?.value?"Required.":!1},render:({field:{onChange:s,ref:c,...h}})=>n.createElement(oe,{...h,defaultValue:k.key?{label:k.key,value:k.key}:void 0,options:Be,onChange:f=>{s(f.value),me(f.value)},type:"key"})})),n.createElement(O.c,{className:r.equalSign},"="),n.createElement(P.D,{className:r.labelInput,invalid:!!y.labels?.[t]?.value?.message,error:y.labels?.[t]?.value?.message,"data-testid":`label-value-${t}`},n.createElement(I.e,{control:C,name:`labels.${t}.value`,rules:{required:v[t]?.value?"Required.":!1},render:({field:{onChange:s,ref:c,...h}})=>n.createElement(oe,{...h,defaultValue:k.value?{label:k.value,value:k.value}:void 0,options:Ne,onChange:f=>{s(f.value)},onOpenMenu:()=>{me(v[t].key)},type:"value"})})),n.createElement(re,{className:r.deleteLabelButton,index:t,remove:Z})))),n.createElement(_,{className:r.addLabelButton,append:$})))},ie=()=>{const o=(0,b.of)(ee),{register:r,control:C,watch:N,formState:{errors:y}}=(0,e.xW)(),v=N("labels"),{fields:T,remove:Z,append:$}=(0,e.jz)({control:C,name:"labels"});return n.createElement(n.Fragment,null,T.map((L,m)=>n.createElement("div",{key:L.id},n.createElement("div",{className:(0,l.cx)(o.flexRow,o.centerAlignRow),"data-testid":"alertlabel-input-wrapper"},n.createElement(P.D,{className:o.labelInput,invalid:!!y.labels?.[m]?.key?.message,error:y.labels?.[m]?.key?.message},n.createElement(U.p,{...r(`labels.${m}.key`,{required:{value:!!v[m]?.value,message:"Required."}}),placeholder:"key","data-testid":`label-key-${m}`,defaultValue:L.key})),n.createElement(O.c,{className:o.equalSign},"="),n.createElement(P.D,{className:o.labelInput,invalid:!!y.labels?.[m]?.value?.message,error:y.labels?.[m]?.value?.message},n.createElement(U.p,{...r(`labels.${m}.value`,{required:{value:!!v[m]?.key,message:"Required."}}),placeholder:"value","data-testid":`label-value-${m}`,defaultValue:L.value})),n.createElement(re,{className:o.deleteLabelButton,index:m,remove:Z})))),n.createElement(_,{className:o.addLabelButton,append:$}))},de=({dataSourceName:o})=>{const r=(0,b.of)(ee);return n.createElement("div",null,n.createElement(D.B,{direction:"column",gap:1},n.createElement(B.E,{element:"h5"},"Labels"),n.createElement(D.B,{direction:"row",gap:1},n.createElement(B.E,{variant:"bodySmall",color:"secondary"},"Add labels to your rule to annotate your rules, ease searching, or route to a notification policy."),n.createElement(Ae.G,{contentText:`The dropdown only displays labels that you have previously used for alerts.
            Select a label from the options below or type in a new one.`,title:"Labels"}))),n.createElement("div",{className:r.labelsContainer}),o?n.createElement(ce,{dataSourceName:o}):n.createElement(ie,null))},ee=o=>({icon:(0,l.css)({marginRight:o.spacing(.5)}),flexColumn:(0,l.css)({display:"flex",flexDirection:"column"}),flexRow:(0,l.css)({display:"flex",flexDirection:"row",justifyContent:"flex-start","& + button":{marginLeft:o.spacing(.5)}}),deleteLabelButton:(0,l.css)({marginLeft:o.spacing(.5),alignSelf:"flex-start"}),addLabelButton:(0,l.css)({flexGrow:0,alignSelf:"flex-start"}),centerAlignRow:(0,l.css)({alignItems:"baseline"}),equalSign:(0,l.css)({alignSelf:"flex-start",width:"28px",justifyContent:"center",marginLeft:o.spacing(.5)}),labelInput:(0,l.css)({width:"175px",marginBottom:`-${o.spacing(1)}`,"& + &":{marginLeft:o.spacing(1)}}),labelsContainer:(0,l.css)({marginBottom:o.spacing(3)})}),ue=de},64100:(q,M,a)=>{a.d(M,{G:()=>P});var l=a(32196),n=a(96540),e=a(40845),x=a(60782),b=a(67061),S=a(14578),D=a(94753);function P({contentText:O,externalLink:U,linkText:B,title:d}){const W=(0,e.of)(I);return n.createElement(x.G,{content:n.createElement("div",{className:W.mutedText},O),title:n.createElement(b.B,{gap:1,direction:"row"},n.createElement(S.I,{name:"question-circle"}),d),footer:U?n.createElement("a",{href:U,target:"_blank",rel:"noreferrer"},n.createElement(b.B,{direction:"row",gap:.5,alignItems:"center"},n.createElement(D.E,{color:"link"},B," ",n.createElement(S.I,{size:"sm",name:"external-link-alt"})))):void 0,closeButton:!0,placement:"bottom-start"},n.createElement("div",{className:W.helpInfo},n.createElement(b.B,{direction:"row",alignItems:"center",gap:.5},n.createElement(S.I,{name:"question-circle",size:"sm"}),n.createElement(D.E,{variant:"bodySmall",color:"primary"},"Need help?"))))}const I=O=>({mutedText:(0,l.css)`
    color: ${O.colors.text.secondary};
    font-size: ${O.typography.size.sm};
  `,helpInfo:(0,l.css)`
    cursor: pointer;
    text-decoration: underline;
  `})},271:(q,M,a)=>{a.d(M,{P:()=>D});var l=a(32196),n=a(96540),e=a(40845),x=a(84167),b=a(94753),S=a(67061);const D=({title:I,stepNo:O,children:U,fullWidth:B=!1,description:d})=>{const W=(0,e.of)(P);return n.createElement("div",{className:W.parent},n.createElement(x.n,{className:(0,l.cx)(B&&W.fullWidth),label:n.createElement(b.E,{variant:"h3"},O,". ",I)},n.createElement(S.B,{direction:"column"},d&&n.createElement("div",{className:W.description},d),U)))},P=I=>({parent:(0,l.css)`
    display: flex;
    flex-direction: row;
    max-width: ${I.breakpoints.values.xl}px;
    border: solid 1px ${I.colors.border.weak};
    border-radius: ${I.shape.radius.default};
    padding: ${I.spacing(2)} ${I.spacing(3)};
  `,description:(0,l.css)`
    margin-top: -${I.spacing(2)};
  `,fullWidth:(0,l.css)`
    width: 100%;
  `})},51488:(q,M,a)=>{a.d(M,{f:()=>n});var l=a(82843);function n(e,x){const b=l.m.endpoints.getAlertmanagerConfiguration.useQuery(e??"",{...x,skip:!e});return{...b,error:b.error}}}}]);

//# sourceMappingURL=1660.e1f66118fb028d12074f.js.map