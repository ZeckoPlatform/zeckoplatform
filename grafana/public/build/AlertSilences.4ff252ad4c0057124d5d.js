"use strict";(self.webpackChunkgrafana=self.webpackChunkgrafana||[]).push([[9347],{40715:(W,C,a)=>{a.d(C,{o:()=>D});var e=a(96540),y=a(80348),g=a(97007);function D(S){const M=(0,y.useDispatch)(),O=(0,e.useRef)(S);O.current=S,(0,e.useEffect)(()=>()=>{M((0,g.N)({cleanupAction:O.current}))},[M])}},24480:(W,C,a)=>{a.r(C),a.d(C,{default:()=>xt});var e=a(96540),y=a(24180),g=a(42418),D=a(66602),S=a(80348),M=a(77583),O=a(33450),B=a(57895),r=a(32196),I=a(2543),h=a(49785),x=a(40996),f=a(70416),T=a(43127),N=a(47232),Z=a(32264),P=a(40845),ve=a(84167),b=a(88575),K=a(10354),he=a(21744),F=a(55852),pe=a(40715),L=a(60021),Ae=a(39964),J=a(61410),w=a(23770),R=a(98164),ye=a(32642),U=a(56361),X=a(88467),Se=a(16504),xe=a(88323),De=a(29158);const Ce=({className:t})=>{const n=(0,P.of)(Me),s=(0,h.xW)(),{control:o,register:l,formState:{errors:m}}=s,{fields:c=[],append:E,remove:i}=(0,h.jz)({name:"matchers"});return e.createElement("div",{className:(0,r.cx)(t,n.wrapper)},e.createElement(b.D,{label:"Matching labels",required:!0},e.createElement("div",null,e.createElement("div",{className:n.matchers},c.map((v,d)=>e.createElement("div",{className:n.row,key:`${v.id}`,"data-testid":"matcher"},e.createElement(b.D,{label:"Label",invalid:!!m?.matchers?.[d]?.name,error:m?.matchers?.[d]?.name?.message},e.createElement(K.p,{...l(`matchers.${d}.name`,{required:{value:!0,message:"Required."}}),defaultValue:v.name,placeholder:"label"})),e.createElement(b.D,{label:"Operator"},e.createElement(Se.e,{control:o,render:({field:{onChange:p,ref:u,...A}})=>e.createElement(xe.l6,{...A,onChange:z=>p(z.value),className:n.matcherOptions,options:R.xH,"aria-label":"operator"}),defaultValue:v.operator||R.xH[0].value,name:`matchers.${d}.operator`,rules:{required:{value:!0,message:"Required."}}})),e.createElement(b.D,{label:"Value",invalid:!!m?.matchers?.[d]?.value,error:m?.matchers?.[d]?.value?.message},e.createElement(K.p,{...l(`matchers.${d}.value`,{required:{value:!0,message:"Required."}}),defaultValue:v.value,placeholder:"value"})),c.length>1&&e.createElement(De.K,{className:n.removeButton,tooltip:"Remove matcher",name:"trash-alt",onClick:()=>i(d)},"Remove")))),e.createElement(F.$n,{type:"button",icon:"plus",variant:"secondary",onClick:()=>{const v={name:"",value:"",operator:L.ho.equal};E(v)}},"Add matcher"))))},Me=t=>({wrapper:(0,r.css)`
      margin-top: ${t.spacing(2)};
    `,row:(0,r.css)`
      display: flex;
      align-items: flex-start;
      flex-direction: row;
      background-color: ${t.colors.background.secondary};
      padding: ${t.spacing(1)} ${t.spacing(1)} 0 ${t.spacing(1)};
      & > * + * {
        margin-left: ${t.spacing(2)};
      }
    `,removeButton:(0,r.css)`
      margin-left: ${t.spacing(1)};
      margin-top: ${t.spacing(2.5)};
    `,matcherOptions:(0,r.css)`
      min-width: 140px;
    `,matchers:(0,r.css)`
      max-width: ${t.breakpoints.values.sm}px;
      margin: ${t.spacing(1)} 0;
      padding-top: ${t.spacing(.5)};
    `}),Ie=Ce;var Pe=a(54230);const $e=()=>{const{control:t,getValues:n}=(0,h.xW)(),{field:{onChange:s,value:o},fieldState:{invalid:l}}=(0,h.as)({name:"startsAt",control:t,rules:{validate:A=>n().endsAt>A}}),{field:{onChange:m,value:c},fieldState:{invalid:E}}=(0,h.as)({name:"endsAt",control:t,rules:{validate:A=>n().startsAt<A}}),{field:{onChange:i,value:v}}=(0,h.as)({name:"timeZone",control:t}),d=l||E,p=(0,N.KQ)(o),u=(0,N.KQ)(c);return e.createElement(b.D,{className:Oe.timeRange,label:"Silence start and end",error:d?"To is before or the same as from":"",invalid:d},e.createElement(Pe.b,{value:{from:p,to:u,raw:{from:p,to:u}},timeZone:v,onChange:A=>{s((0,N.KQ)(A.from)),m((0,N.KQ)(A.to))},onChangeTimeZone:A=>i(A),hideTimeZone:!1,hideQuickRanges:!0,placeholder:"Select time range"}))},Oe={timeRange:(0,r.css)`
    width: 400px;
  `};var Te=a(39938),Re=a(39558),Ne=a(82843),be=a(25968),te=a(69087),ae=a(75591),ne=a(97754);const Be=({amSourceName:t,matchers:n})=>{const{useGetAlertmanagerAlertsQuery:s}=Ne.m,o=(0,P.of)(se),l=Le(),m=n.some(d=>d.value&&d.name),{currentData:c=[],isFetching:E,isError:i}=s({amSourceName:t,filter:{matchers:n}},{skip:!m,refetchOnMountOrArgChange:!0}),v=c.map(d=>({id:d.fingerprint,data:d}));return e.createElement("div",null,e.createElement("h4",{className:o.title},"Affected alert instances",v.length>0?e.createElement(Te.E,{className:o.badge,color:"blue",text:v.length}):null),!m&&e.createElement("span",null,"Add a valid matcher to see affected alerts"),i&&e.createElement(g.F,{title:"Preview not available",severity:"error"},"Error occured when generating affected alerts preview. Are you matchers valid?"),E&&e.createElement(Re._,{text:"Loading..."}),!E&&!i&&m&&e.createElement("div",{className:o.table},v.length>0?e.createElement(ae.E,{items:v,isExpandable:!1,cols:l,pagination:{itemsPerPage:10}}):e.createElement("span",null,"No matching alert instances found")))};function Le(){const t=(0,P.of)(se);return[{id:"state",label:"State",renderCell:function({data:s}){return e.createElement(ne.y,{state:s.status.state})},size:"120px",className:t.stateColumn},{id:"labels",label:"Labels",renderCell:function({data:s}){return e.createElement(te.m,{labels:s.labels,size:"sm"})},size:"auto"},{id:"created",label:"Created",renderCell:function({data:s}){return e.createElement(e.Fragment,null,(0,be.mo)(s.startsAt)?"-":(0,N.KQ)(s.startsAt).format("YYYY-MM-DD HH:mm:ss"))},size:"180px"}]}const se=t=>({table:(0,r.css)`
    max-width: ${t.breakpoints.values.lg}px;
  `,moreMatches:(0,r.css)`
    margin-top: ${t.spacing(1)};
  `,title:(0,r.css)`
    display: flex;
    align-items: center;
  `,badge:(0,r.css)`
    margin-left: ${t.spacing(1)};
  `,stateColumn:(0,r.css)`
    display: flex;
    align-items: center;
  `}),Ue=t=>{const n={},s=t.get("comment"),o=t.getAll("matcher"),l=(0,ye.ou)(o);return l.length&&(n.matchers=l.map(R.MU)),s&&(n.comment=s),n},Fe=(t,n)=>{const s=new Date;if(n){const l=Date.parse(n.endsAt)<Date.now()?{start:s,end:(0,f.Ri)(s,{hours:2})}:{start:new Date(n.startsAt),end:new Date(n.endsAt)};return{id:n.id,startsAt:l.start.toISOString(),endsAt:l.end.toISOString(),comment:n.comment,createdBy:n.createdBy,duration:(0,f.dU)(l),isRegex:!1,matchers:n.matchers?.map(R.MU)||[],matcherName:"",matcherValue:"",timeZone:T.lE}}else{const o=(0,f.Ri)(s,{hours:2});return{id:"",startsAt:s.toISOString(),endsAt:o.toISOString(),comment:`created ${(0,N.KQ)().format("YYYY-MM-DD HH:mm")}`,createdBy:Z.$.bootData.user.name,duration:"2h",isRegex:!1,matchers:[{name:"",value:"",operator:L.ho.equal}],matcherName:"",matcherValue:"",timeZone:T.lE,...Ue(t)}}},We=({silence:t,alertManagerSourceName:n})=>{const[s]=(0,Ae.l)(),o=(0,e.useMemo)(()=>Fe(s,t),[t,s]),l=(0,h.mN)({defaultValues:o}),m=(0,S.useDispatch)(),c=(0,P.of)(Ke),[E,i]=(0,e.useState)(o.matchers.map(R.Wc)),{loading:v}=(0,J.$)($=>$.updateSilence);(0,pe.o)($=>$.unifiedAlerting.updateSilence=X.jA);const{register:d,handleSubmit:p,formState:u,watch:A,setValue:z,clearErrors:Dt}=l,Ct=$=>{const{id:V,startsAt:G,endsAt:It,comment:Pt,createdBy:$t,matchers:Ot}=$,Tt=Ot.map(R.Wc),fe=(0,I.pickBy)({id:V,startsAt:G,endsAt:It,comment:Pt,createdBy:$t,matchers:Tt},Rt=>!!Rt);m((0,w.a7)({alertManagerSourceName:n,payload:fe,exitOnSave:!0,successMessage:`Silence ${fe.id?"updated":"created"}`}))},Q=A("duration"),Y=A("startsAt"),H=A("endsAt"),ue=A("matchers"),[ge,Ee]=(0,e.useState)(Q);(0,x.A)(()=>{if((0,f.vd)(Y)&&(0,f.vd)(H))if(Q!==ge)z("endsAt",(0,N.KQ)((0,f.Ri)(new Date(Y),(0,f.E9)(Q))).toISOString()),Ee(Q);else{const $=new Date(Y).valueOf();if(new Date(H).valueOf()>$){const G=(0,f.dU)({start:new Date(Y),end:new Date(H)});z("duration",G),Ee(G)}}},700,[Dt,Q,H,ge,z,Y]),(0,x.A)(()=>{const $=ue.filter(V=>V.name&&V.value).map(R.Wc);(0,I.isEqual)(E,$)||i($)},700,[ue]);const Mt=!!(Z.$.bootData.user.isSignedIn&&Z.$.bootData.user.name);return e.createElement(h.Op,{...l},e.createElement("form",{onSubmit:p(Ct)},e.createElement(ve.n,{label:`${t?"Recreate silence":"Create silence"}`},e.createElement("div",{className:(0,r.cx)(c.flexRow,c.silencePeriod)},e.createElement($e,null),e.createElement(b.D,{label:"Duration",invalid:!!u.errors.duration,error:u.errors.duration&&(u.errors.duration.type==="required"?"Required field":u.errors.duration.message)},e.createElement(K.p,{className:c.createdBy,...d("duration",{validate:$=>Object.keys((0,f.E9)($)).length===0?"Invalid duration. Valid example: 1d 4h (Available units: y, M, w, d, h, m, s)":void 0}),id:"duration"}))),e.createElement(Ie,null),e.createElement(b.D,{className:(0,r.cx)(c.field,c.textArea),label:"Comment",required:!0,error:u.errors.comment?.message,invalid:!!u.errors.comment},e.createElement(he.f,{...d("comment",{required:{value:!0,message:"Required."}}),rows:5,placeholder:"Details about the silence"})),!Mt&&e.createElement(b.D,{className:(0,r.cx)(c.field,c.createdBy),label:"Created By",required:!0,error:u.errors.createdBy?.message,invalid:!!u.errors.createdBy},e.createElement(K.p,{...d("createdBy",{required:{value:!0,message:"Required."}}),placeholder:"Who's creating the silence"})),e.createElement(Be,{amSourceName:n,matchers:E})),e.createElement("div",{className:c.flexRow},v&&e.createElement(F.$n,{disabled:!0,icon:"spinner",variant:"primary"},"Saving..."),!v&&e.createElement(F.$n,{type:"submit"},"Save silence"),e.createElement(F.z9,{href:(0,U.nL)("alerting/silences",n),variant:"secondary"},"Cancel"))))},Ke=t=>({field:(0,r.css)`
    margin: ${t.spacing(1,0)};
  `,textArea:(0,r.css)`
    max-width: ${t.breakpoints.values.sm}px;
  `,createdBy:(0,r.css)`
    width: 200px;
  `,flexRow:(0,r.css)`
    display: flex;
    flex-direction: row;
    justify-content: flex-start;

    & > * {
      margin-right: ${t.spacing(1)};
    }
  `,silencePeriod:(0,r.css)`
    max-width: ${t.breakpoints.values.sm}px;
  `}),re=We;var j=a(85858),k=a(67061),ze=a(57418),q=a(14578),Qe=a(50720),_=a(83277),ee=a(19073),Ye=a(64853);const le=({className:t,...n})=>{const s=(0,P.of)(Ve);return e.createElement(F.$n,{variant:"secondary",size:"xs",className:(0,r.cx)(s.wrapper,t),...n})},Ve=t=>({wrapper:(0,r.css)`
    height: 24px;
    font-size: ${t.typography.bodySmall.fontSize};
  `});var we=a(72275),je=a(64149);const He=({matchers:t})=>{const n=(0,P.of)(Ge);return e.createElement("div",null,e.createElement(je.L,{className:n.tags,tags:t.map(s=>`${s.name}${(0,R.MN)(s)}${s.value}`)}))},Ge=()=>({tags:(0,r.css)`
    justify-content: flex-start;
  `});var Ze=a(76442),Je=a(7521),Xe=a(16233),ke=a(75471);const qe=({alertManagerSourceName:t})=>{const n=(0,ke.jy)(t);return Xe.TP.hasPermission(n.create)?e.createElement(Je.A,{title:"You haven't created any silences yet",buttonIcon:"bell-slash",buttonLink:(0,U.nL)("alerting/silence/new",t),buttonTitle:"Create silence"}):e.createElement(Ze.c,{callToActionElement:e.createElement("div",null),message:"No silences found."})};var _e=a(4554),et=a(64047);const tt=({alert:t,className:n})=>{const[s,o]=(0,e.useState)(!0),l=(0,f.dU)({start:new Date(t.startsAt),end:new Date(t.endsAt)}),m=Object.entries(t.labels).reduce((c,[E,i])=>((E==="alertname"||E==="__alert_rule_title__")&&(c=i),c),"");return e.createElement(e.Fragment,null,e.createElement("tr",{className:n},e.createElement("td",null,e.createElement(et.e,{isCollapsed:s,onToggle:c=>o(c)})),e.createElement("td",null,e.createElement(ne.y,{state:t.status.state})),e.createElement("td",null,"for ",l," seconds"),e.createElement("td",null,m)),!s&&e.createElement("tr",{className:n},e.createElement("td",null),e.createElement("td",{colSpan:5},e.createElement(te.m,{labels:t.labels,size:"sm"}))))},at=({silencedAlerts:t})=>{const n=(0,P.of)(_e.L),s=(0,P.of)(nt);return t.length?e.createElement("table",{className:(0,r.cx)(n.table,s.tableMargin)},e.createElement("colgroup",null,e.createElement("col",{className:n.colExpand}),e.createElement("col",{className:s.colState}),e.createElement("col",null),e.createElement("col",{className:s.colName})),e.createElement("thead",null,e.createElement("tr",null,e.createElement("th",null),e.createElement("th",null,"State"),e.createElement("th",null),e.createElement("th",null,"Alert name"))),e.createElement("tbody",null,t.map((o,l)=>e.createElement(tt,{key:o.fingerprint,alert:o,className:l%2===0?n.evenRow:""})))):null},nt=t=>({tableMargin:(0,r.css)`
    margin-bottom: ${t.spacing(1)};
  `,colState:(0,r.css)`
    width: 110px;
  `,colName:(0,r.css)`
    width: 65%;
  `}),st=at,rt=({silence:t})=>{const{startsAt:n,endsAt:s,comment:o,createdBy:l,silencedAlerts:m}=t,c=(0,P.of)(lt),E="YYYY-MM-DD HH:mm",i=j.parse(n),v=j.parse(s),d=(0,f.dU)({start:new Date(n),end:new Date(s)});return e.createElement("div",{className:c.container},e.createElement("div",{className:c.title},"Comment"),e.createElement("div",null,o),e.createElement("div",{className:c.title},"Schedule"),e.createElement("div",null,`${i?.format(E)} - ${v?.format(E)}`),e.createElement("div",{className:c.title},"Duration"),e.createElement("div",null," ",d),e.createElement("div",{className:c.title},"Created by"),e.createElement("div",null," ",l),e.createElement("div",{className:c.title},"Affected alerts"),e.createElement(st,{silencedAlerts:m}))},lt=t=>({container:(0,r.css)`
    display: grid;
    grid-template-columns: 1fr 9fr;
    grid-row-gap: 1rem;
  `,title:(0,r.css)`
    color: ${t.colors.text.primary};
  `,row:(0,r.css)`
    margin: ${t.spacing(1,0)};
  `});var ct=a(65415);const ot={[L.RC.Active]:"good",[L.RC.Expired]:"neutral",[L.RC.Pending]:"neutral"},it=({state:t})=>e.createElement(ct.O,{state:ot[t]},t);var dt=a(60029),mt=a(56034);const ce=()=>(0,I.uniqueId)("query-string-"),ut=()=>{const[t,n]=(0,e.useState)(ce()),[s,o]=(0,_.s)(),{queryString:l}=(0,U.qy)(s),m=(0,P.of)(gt),c=(0,I.debounce)(v=>{const d=v.target;o({queryString:d.value||null})},400),E=()=>{o({queryString:null,silenceState:null}),setTimeout(()=>n(ce()))},i=l&&l.length>3?(0,R.J$)(l).length===0:!1;return e.createElement("div",{className:m.flexRow},e.createElement(b.D,{className:m.rowChild,label:e.createElement(dt.J,null,e.createElement(k.B,{gap:.5},e.createElement("span",null,"Search by matchers"),e.createElement(mt.m,{content:e.createElement("div",null,"Filter silences by matchers using a comma separated list of matchers, ie:",e.createElement("pre",null,"severity=critical, instance=~cluster-us-.+"))},e.createElement(q.I,{name:"info-circle",size:"sm"})))),invalid:i,error:i?"Query must use valid matcher syntax":null},e.createElement(K.p,{key:t,className:m.searchInput,prefix:e.createElement(q.I,{name:"search"}),onChange:c,defaultValue:l??"",placeholder:"Search","data-testid":"search-query-input"})),l&&e.createElement("div",{className:m.rowChild},e.createElement(F.$n,{variant:"secondary",icon:"times",onClick:E},"Clear filters")))},gt=t=>({searchInput:(0,r.css)`
    width: 360px;
  `,flexRow:(0,r.css)`
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    padding-bottom: ${t.spacing(3)};
    border-bottom: 1px solid ${t.colors.border.medium};
  `,rowChild:(0,r.css)`
    margin-right: ${t.spacing(1)};
    margin-bottom: 0;
    max-height: 52px;
  `,fieldLabel:(0,r.css)`
    font-size: 12px;
    font-weight: 500;
  `}),Et=({silences:t,alertManagerAlerts:n,alertManagerSourceName:s})=>{const o=(0,P.of)(de),[l]=(0,_.s)(),m=ie(t,!1),c=ie(t,!0),{silenceState:E}=(0,U.qy)(l),i=E===L.RC.Expired,v=(0,e.useMemo)(()=>{const p=u=>n.filter(A=>A.status.silencedBy.includes(u));return m.map(u=>{const A=p(u.id);return{id:u.id,data:{...u,silencedAlerts:A}}})},[m,n]),d=(0,e.useMemo)(()=>{const p=u=>n.filter(A=>A.status.silencedBy.includes(u));return c.map(u=>{const A=p(u.id);return{id:u.id,data:{...u,silencedAlerts:A}}})},[c,n]);return e.createElement("div",{"data-testid":"silences-table"},!!t.length&&e.createElement(k.B,{direction:"column"},e.createElement(ut,null),e.createElement(Ye._,{actions:[ee.QI.CreateSilence]},e.createElement("div",{className:o.topButtonContainer},e.createElement(F.z9,{href:(0,U.nL)("/alerting/silence/new",s),icon:"plus"},"Add Silence"))),e.createElement(oe,{items:v,alertManagerSourceName:s,dataTestId:"not-expired-table"}),d.length>0&&e.createElement(ze.M,{label:`Expired silences (${d.length})`,isOpen:i},e.createElement("div",{className:o.callout},e.createElement(q.I,{className:o.calloutIcon,name:"info-circle"}),e.createElement("span",null,"Expired silences are automatically deleted after 5 days.")),e.createElement(oe,{items:d,alertManagerSourceName:s,dataTestId:"expired-table"}))),!t.length&&e.createElement(qe,{alertManagerSourceName:s}))};function oe({items:t,alertManagerSourceName:n,dataTestId:s}){const o=ft(n);return t.length?e.createElement(ae.E,{pagination:{itemsPerPage:25},items:t,cols:o,isExpandable:!0,dataTestId:s,renderExpandedContent:({data:l})=>e.createElement(rt,{silence:l})}):e.createElement(e.Fragment,null,"No matching silences found")}const ie=(t,n=!1)=>{const[s]=(0,_.s)();return(0,e.useMemo)(()=>{const{queryString:o}=(0,U.qy)(s),l=s?.silenceIds;return t.filter(m=>typeof l=="string"&&!l.split(",").includes(m.id)||o&&!(0,R.J$)(o).every(i=>m.matchers?.some(({name:v,value:d,isEqual:p,isRegex:u})=>i.name===v&&i.value===d&&i.isEqual===p&&i.isRegex===u))?!1:n?m.status.state===L.RC.Expired:m.status.state!==L.RC.Expired)},[s,t,n])},de=t=>({topButtonContainer:(0,r.css)`
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
  `,addNewSilence:(0,r.css)`
    margin: ${t.spacing(2,0)};
  `,callout:(0,r.css)`
    background-color: ${t.colors.background.secondary};
    border-top: 3px solid ${t.colors.info.border};
    border-radius: ${t.shape.radius.default};
    height: 62px;
    display: flex;
    flex-direction: row;
    align-items: center;

    & > * {
      margin-left: ${t.spacing(1)};
    }
  `,calloutIcon:(0,r.css)`
    color: ${t.colors.info.text};
  `,editButton:(0,r.css)`
    margin-left: ${t.spacing(.5)};
  `});function ft(t){const n=(0,S.useDispatch)(),s=(0,P.of)(de),[o,l]=(0,ee.L7)(ee.QI.UpdateSilence);return(0,e.useMemo)(()=>{const m=E=>{n((0,w.Nj)(t,E))},c=[{id:"state",label:"State",renderCell:function({data:{status:i}}){return e.createElement(it,{state:i.state})},size:4},{id:"matchers",label:"Matching labels",renderCell:function({data:{matchers:i}}){return e.createElement(He,{matchers:i||[]})},size:10},{id:"alerts",label:"Alerts",renderCell:function({data:{silencedAlerts:i}}){return e.createElement("span",{"data-testid":"alerts"},i.length)},size:4},{id:"schedule",label:"Schedule",renderCell:function({data:{startsAt:i,endsAt:v}}){const d=j.parse(i),p=j.parse(v),u="YYYY-MM-DD HH:mm";return e.createElement(e.Fragment,null," ",d?.format(u)," ","-",p?.format(u))},size:7}];return o&&l&&c.push({id:"actions",label:"Actions",renderCell:function({data:i}){return e.createElement(k.B,{gap:.5},i.status.state==="expired"?e.createElement(Qe.N,{href:(0,U.nL)(`/alerting/silence/${i.id}/edit`,t)},e.createElement(le,{icon:"sync"},"Recreate")):e.createElement(le,{icon:"bell",onClick:()=>m(i.id)},"Unsilence"),i.status.state!=="expired"&&e.createElement(we.M,{className:s.editButton,to:(0,U.nL)(`/alerting/silence/${i.id}/edit`,t),icon:"pen",tooltip:"edit"}))},size:5}),c},[t,n,s.editButton,l,o])}const vt=Et,me={icon:"bell-slash"};function ht(){const{isExact:t,path:n}=(0,y.W5)(),[s,o]=(0,e.useState)();return(0,e.useEffect)(()=>{n==="/alerting/silence/new"?o({...me,id:"silence-new",text:"Add silence"}):n==="/alerting/silence/:id/edit"&&o({...me,id:"silence-edit",text:"Edit silence"})},[n,t]),s}var pt=a(70383),At=a(55740);const yt=()=>{const{selectedAlertmanager:t}=(0,pt.VI)(),n=(0,S.useDispatch)(),s=(0,J.$)(p=>p.silences),o=(0,J.$)(p=>p.amAlerts),l=t?o[t]||X.jA:void 0,{currentData:m}=M.L.useDiscoverAmFeaturesQuery({amSourceName:t??""},{skip:!t});(0,e.useEffect)(()=>{function p(){t&&(n((0,w.ly)(t)),n((0,w.El)(t)))}p();const u=setInterval(()=>p,At.wG);return()=>{clearInterval(u)}},[t,n]);const{result:c,loading:E,error:i}=t&&s[t]||X.jA,v=(0,e.useCallback)(p=>c&&c.find(u=>u.id===p),[c]),d=i?.message?.includes("the Alertmanager is not configured")&&m?.lazyConfigInit;return t?e.createElement(e.Fragment,null,e.createElement(B.M,{currentAlertmanager:t}),d&&e.createElement(g.F,{title:"The selected Alertmanager has no configuration",severity:"warning"},"Create a new contact point to create a configuration using the default values or contact your administrator to set up the Alertmanager."),i&&!E&&!d&&e.createElement(g.F,{severity:"error",title:"Error loading silences"},i.message||"Unknown error."),l?.error&&!l?.loading&&!d&&e.createElement(g.F,{severity:"error",title:"Error loading Alertmanager alerts"},l.error?.message||"Unknown error."),c&&!i&&e.createElement(y.dO,null,e.createElement(y.qh,{exact:!0,path:"/alerting/silences"},e.createElement(vt,{silences:c,alertManagerAlerts:l?.result??[],alertManagerSourceName:t})),e.createElement(y.qh,{exact:!0,path:"/alerting/silence/new"},e.createElement(re,{alertManagerSourceName:t})),e.createElement(y.qh,{exact:!0,path:"/alerting/silence/:id/edit"},({match:p})=>p?.params.id&&e.createElement(re,{silence:v(p.params.id),alertManagerSourceName:t})))):null};function St(){const t=ht();return e.createElement(O.y,{navId:"silences",pageNav:t,accessType:"instance"},e.createElement(yt,null))}const xt=(0,D.Xc)(St,{style:"page"})},64853:(W,C,a)=>{a.d(C,{_:()=>S});var e=a(2543),y=a.n(e),g=a(96540),D=a(19073);const S=({actions:h,children:x})=>{const f=(0,e.filter)(h,r),T=(0,e.filter)(h,I);return f.length?g.createElement(M,{actions:f},x):T.length?g.createElement(O,{actions:T},x):null},M=({actions:h,children:x})=>{const f=(0,D.iI)();return B(f,h)?g.createElement(g.Fragment,null,x):null},O=({actions:h,children:x})=>{const f=(0,D.e2)();return B(f,h)?g.createElement(g.Fragment,null,x):null};function B(h,x){return(0,e.chain)(h).pick(x).values().value().some(([f,T])=>T===!0)}function r(h){return Object.values(D.QI).includes(h)}function I(h){return Object.values(D.RY).includes(h)}},57895:(W,C,a)=>{a.d(C,{M:()=>B});var e=a(32196),y=a(96540),g=a(40845),D=a(42418),S=a(60021),M=a(82843),O=a(57220);function B({currentAlertmanager:I}){const h=(0,g.of)(r),x=I===O.hY,{currentData:f}=M.m.endpoints.getAlertmanagerChoiceStatus.useQuery(void 0,{skip:!x});if(!(f?.alertmanagersChoice&&[S.nA.External,S.nA.All].includes(f?.alertmanagersChoice))||!x)return null;const N=f.numExternalAlertmanagers>0;return f.alertmanagersChoice===S.nA.External?y.createElement(D.F,{title:"Grafana alerts are not delivered to Grafana Alertmanager"},"Grafana is configured to send alerts to external Alertmanagers only. Changing Grafana Alertmanager configuration will not affect delivery of your alerts.",y.createElement("div",{className:h.adminHint},"To change your Alertmanager setup, go to the Alerting Admin page. If you do not have access, contact your Administrator.")):f.alertmanagersChoice===S.nA.All&&N?y.createElement(D.F,{title:"You have additional Alertmanagers to configure",severity:"warning"},"Ensure you make configuration changes in the correct Alertmanagers; both internal and external. Changing one will not affect the others.",y.createElement("div",{className:h.adminHint},"To change your Alertmanager setup, go to the Alerting Admin page. If you do not have access, contact your Administrator.")):null}const r=I=>({adminHint:(0,e.css)`
    font-size: ${I.typography.bodySmall.fontSize};
    font-weight: ${I.typography.bodySmall.fontWeight};
  `})},72275:(W,C,a)=>{a.d(C,{M:()=>D});var e=a(96540),y=a(56034),g=a(55852);const D=({tooltip:S,icon:M,to:O,target:B,onClick:r,className:I,tooltipPlacement:h="top",...x})=>{const f=typeof S=="string"?S:void 0;return e.createElement(y.m,{content:S,placement:h},O?e.createElement(g.z9,{variant:"secondary",fill:"text",icon:M,href:O,size:"sm",target:B,...x,"aria-label":f}):e.createElement(g.$n,{className:I,variant:"secondary",fill:"text",size:"sm",icon:M,type:"button",onClick:r,...x,"aria-label":f}))}},97754:(W,C,a)=>{a.d(C,{y:()=>S});var e=a(96540),y=a(60021),g=a(65415);const D={[y.Or.Active]:"bad",[y.Or.Unprocessed]:"neutral",[y.Or.Suppressed]:"info"},S=({state:M})=>e.createElement(g.O,{state:D[M]},M)},4554:(W,C,a)=>{a.d(C,{L:()=>y});var e=a(32196);const y=g=>({table:(0,e.css)`
    width: 100%;
    border-radius: ${g.shape.radius.default};
    border: solid 1px ${g.colors.border.weak};
    background-color: ${g.colors.background.secondary};

    th {
      padding: ${g.spacing(1)};
    }

    td {
      padding: 0 ${g.spacing(1)};
    }

    tr {
      height: 38px;
    }
  `,evenRow:(0,e.css)`
    background-color: ${g.colors.background.primary};
  `,colExpand:(0,e.css)`
    width: 36px;
  `,nameCell:(0,e.css)`
    gap: ${g.spacing(1)};
  `,actionsCell:(0,e.css)`
    text-align: right;
    width: 1%;
    white-space: nowrap;

    & > * + * {
      margin-left: ${g.spacing(.5)};
    }
  `})}}]);

//# sourceMappingURL=AlertSilences.4ff252ad4c0057124d5d.js.map