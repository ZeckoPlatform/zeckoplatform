"use strict";(self.webpackChunkgrafana=self.webpackChunkgrafana||[]).push([[3407],{96615:(te,W,n)=>{n.d(W,{K:()=>C});var a=n(96540),U=n(32372),M=n(2543),$=n(83225);function e(l){const s=l.languages.CompletionItemKind.Function;return[{label:$.AlertmanagerTemplateFunction.toUpper,detail:"function(s string)",kind:s},{label:$.AlertmanagerTemplateFunction.toLower,detail:"function(s string)",kind:s},{label:$.AlertmanagerTemplateFunction.title,documentation:"Capitalizes the first letter of each word",detail:"function(s string)",kind:s},{label:$.AlertmanagerTemplateFunction.join,documentation:{value:"Joins an array of strings using the separator provided."},detail:"function(separator string, s []string)",kind:s},{label:$.AlertmanagerTemplateFunction.match,detail:"function",kind:s},{label:$.AlertmanagerTemplateFunction.safeHtml,detail:"function(pattern, repl, text)",kind:s},{label:$.AlertmanagerTemplateFunction.reReplaceAll,detail:"function(pattern, repl, text)",kind:s},{label:$.AlertmanagerTemplateFunction.stringSlice,detail:"function(s ...string)",kind:s}]}var y=n(57954);function P(l){const s={triggerCharacters:["."],provideCompletionItems(b,u,T){const S=b.getWordUntilPosition(u),V={startLineNumber:u.lineNumber,endLineNumber:u.lineNumber,startColumn:S.startColumn,endColumn:S.endColumn},K=new j(l,V);if(!h(b,u))return K.getSnippetsSuggestions();if(T.triggerKind===l.languages.CompletionTriggerKind.Invoke&&!T.triggerCharacter)return K.getFunctionsSuggestions();const ie=b.getWordUntilPosition({lineNumber:u.lineNumber,column:u.column-1});return K.getTemplateDataSuggestions(ie.word)}};return l.languages.registerCompletionItemProvider("go-template",s)}function h(l,s){const b={startLineNumber:s.lineNumber,endLineNumber:s.lineNumber,startColumn:l.getLineMinColumn(s.lineNumber),endColumn:l.getLineMaxColumn(s.lineNumber)},u='\\{\\{[a-zA-Z0-9._() "]+\\}\\}';return l.findMatches(u,b,!0,!1,null,!0).some(S=>S.range.containsPosition(s))}class j{constructor(s,b){this.monaco=s,this.range=b,this.getSnippetsSuggestions=()=>this.getCompletionsFromDefinitions((0,y.Mq)(this.monaco)),this.getFunctionsSuggestions=()=>this.getCompletionsFromDefinitions(e(this.monaco)),this.getTemplateDataSuggestions=u=>{switch(u){case"":return this.getCompletionsFromDefinitions((0,y.Xt)(this.monaco),(0,y.So)(this.monaco));case"Alerts":return this.getCompletionsFromDefinitions((0,y.J2)(this.monaco));case"GroupLabels":case"CommonLabels":case"CommonAnnotations":case"Labels":case"Annotations":return this.getCompletionsFromDefinitions((0,y.KS)(this.monaco));default:return{suggestions:[]}}},this.getCompletionsFromDefinitions=(...u)=>({suggestions:(0,M.concat)(...u).map(S=>R(S,this.range))})}}function R({label:l,detail:s,documentation:b,kind:u,insertText:T},S){const V=typeof l=="string"?l:l.label,K=typeof l=="string"?{label:l,description:s}:{...l};return K.description??=s,{label:K,kind:u,insertText:T??V,range:S,documentation:b,detail:s}}const k="go-template",z={id:k,extensions:[],aliases:[],mimetypes:[],loader:()=>Promise.resolve().then(n.bind(n,83225))},X=(l,s)=>{const{id:b,loader:u}=s;l.languages.getLanguages().find(S=>S.id===b)||(l.languages.register({id:b}),u().then(S=>{l.languages.setMonarchTokensProvider(b,S.language),l.languages.setLanguageConfiguration(b,S.conf)}))},C=l=>{const s=!!l.autoHeight,b=(0,a.useRef)(null),u=T=>{if(s){const S=T.getContentHeight();try{T.layout({height:S,width:NaN})}catch{}}};return(0,a.useEffect)(()=>()=>{b.current?.dispose()},[]),a.createElement(U.B,{showLineNumbers:!0,showMiniMap:!1,...l,onEditorDidMount:u,onBeforeEditorMount:T=>{X(T,z),b.current=P(T)},language:k})}},93407:(te,W,n)=>{n.d(W,{By:()=>at});var a=n(32196),U=n(13999);function M(t,r){return(0,U.f)(t,-r)}const $=null;var e=n(96540),y=n(49785),P=n(24180),h=n(70713),j=n(17172),R=n(40845),k=n(42418),ne=n(84167),z=n(88575),X=n(10354),C=n(63021),l=n(40675),s=n(55852),b=n(57418),u=n(67061),T=n(62930),S=n(40715),V=n(80348),K=n(49962);const Y="/api/alertmanager/grafana/config/api/v1/templates/test",ie=K.H.injectEndpoints({endpoints:t=>({previewTemplate:t.mutation({query:({template:r,alerts:m,name:o})=>({url:Y,data:{template:r,alerts:m,name:o},method:"POST"})})})}),{usePreviewTemplateMutation:Ae}=ie;var xe=n(61410),Te=n(23770),me=n(57220),Le=n(56361),Ne=n(88467),Ce=n(5586),ue=n(48205),pe=n(56034),ge=n(14578),we=n(32372),Re=n(39938),fe=n(91793),$e=n(78369),ae=n(37390),De=n(67647),he=n(39558),Oe=n(82843),q=n(75214),be=n(70026);function Pe({onSelect:t,isOpen:r,onClose:m}){const o=(0,R.of)(Fe),[i,v]=(0,e.useState)(),[c,p]=(0,e.useState)(null),{useGetAlertmanagerAlertsQuery:F}=Oe.m,{currentData:D=[],isFetching:L,isError:G}=F({amSourceName:me.hY,filter:{inhibited:!0,silenced:!0,active:!0}}),[I,B]=(0,e.useState)(""),A=(0,e.useMemo)(()=>{const g={};return!L&&D&&D.forEach(f=>{g[f.labels.alertname]||(g[f.labels.alertname]=[]),g[f.labels.alertname].push(f)}),g},[L,D]),w=(0,e.useCallback)(g=>{v(g),p(null)},[]),N=(0,e.useMemo)(()=>{const g=Object.keys(A).filter(d=>d.toLowerCase().includes(I.toLowerCase())),f={};return g.forEach(d=>{f[d]=A[d]}),f},[A,I]);if(G)return null;const E=Object.keys(N||[]),x=({index:g,style:f})=>{if(!N)return null;const d=E[g],O=d===i;return e.createElement("button",{type:"button",title:d,style:f,className:(0,a.cx)(o.rowButton,{[o.rowOdd]:g%2===1,[o.rowSelected]:O}),onClick:()=>w(d)},e.createElement("div",{className:(0,a.cx)(o.ruleTitle,o.rowButtonTitle)},d),e.createElement("div",{className:o.alertFolder},e.createElement(e.Fragment,null,e.createElement(ge.I,{name:"folder"})," ",N[d][0].labels.grafana_folder??"")))},_=(g,f)=>{const O=g.map(H=>H.labels).map(q.Dd),J=(0,be.Q)(O),Q=(0,be.$)((0,q.Dd)(f.labels),J);return Q.length?(0,q.M4)((0,q.zm)(Q)):(0,q.M4)(f.labels)},ee=({index:g,style:f})=>{const d=(0,e.useMemo)(()=>i?A[i]:[],[]),O=d[g],J=c?.includes(O),Q=(0,e.useMemo)(()=>_(d,O),[d,O]),re=()=>{if(J&&c){p(c.filter(H=>H!==O));return}p([...c||[],O])};return e.createElement("button",{type:"button",style:f,className:(0,a.cx)(o.rowButton,o.instanceButton,{[o.rowOdd]:g%2===1,[o.rowSelected]:J}),onClick:re},e.createElement("div",{className:o.rowButtonTitle,title:O.labels.alertname},e.createElement(pe.m,{placement:"bottom",content:e.createElement("pre",null,JSON.stringify(O,null,2)),theme:"info"},e.createElement("div",null,Q.map((H,dt)=>e.createElement($e.v,{key:dt,name:H,className:o.tag}))))))},Z=()=>{const g=c?.map(f=>({annotations:f.annotations,labels:f.labels,startsAt:f.startsAt,endsAt:f.endsAt}))||[];t(g),le()},le=()=>{v(void 0),p(null),B(""),se("")},oe=()=>{le(),m()},se=g=>{B(g)};return e.createElement("div",null,e.createElement(ae.a,{title:"Select alert instances",className:o.modal,closeOnEscape:!0,isOpen:r,onDismiss:oe,contentClassName:o.modalContent},e.createElement("div",{className:o.container},e.createElement(De.Z,{value:I,onChange:se,title:"Search alert rule",placeholder:"Search alert rule",autoFocus:!0}),e.createElement("div",null,i&&"Select one or more instances from the list below"||""),e.createElement("div",{className:o.column},L&&e.createElement(he._,{text:"Loading rules...",className:o.loadingPlaceholder}),!L&&e.createElement(h.Ay,null,({height:g,width:f})=>e.createElement(fe.Y1,{itemSize:50,height:g,width:f,itemCount:E.length},x))),e.createElement("div",{className:o.column},!i&&!L&&e.createElement("div",{className:o.selectedRulePlaceholder},e.createElement("div",null,"Select an alert rule to get a list of available firing instances")),L&&e.createElement(he._,{text:"Loading rule...",className:o.loadingPlaceholder}),i&&A[i].length&&!L&&e.createElement(h.Ay,null,({width:g,height:f})=>e.createElement(fe.Y1,{itemSize:32,height:f,width:g,itemCount:A[i].length||0},ee)))),e.createElement(ae.a.ButtonRow,null,e.createElement(s.$n,{type:"button",variant:"secondary",onClick:oe},"Cancel"),e.createElement(s.$n,{type:"button",variant:"primary",disabled:!(i&&c),onClick:()=>{i&&c&&Z()}},"Add alert data to payload"))))}const Fe=t=>{const r=(0,s.my)(t);return{container:(0,a.css)`
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      grid-template-rows: min-content auto;
      gap: ${t.spacing(2)};
      flex: 1;
    `,tag:(0,a.css)`
      margin: 5px;
    `,column:(0,a.css)`
      flex: 1 1 auto;
    `,alertLabels:(0,a.css)`
      overflow-x: auto;
      height: 32px;
    `,ruleTitle:(0,a.css)`
      height: 22px;
      font-weight: ${t.typography.fontWeightBold};
    `,rowButton:(0,a.css)`
      ${r};
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
    `,rowButtonTitle:(0,a.css)`
      overflow-x: auto;
    `,rowSelected:(0,a.css)`
      border-color: ${t.colors.primary.border};
    `,rowOdd:(0,a.css)`
      background-color: ${t.colors.background.secondary};
    `,instanceButton:(0,a.css)`
      display: flex;
      gap: ${t.spacing(1)};
      justify-content: space-between;
      align-items: center;
    `,loadingPlaceholder:(0,a.css)`
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    `,selectedRulePlaceholder:(0,a.css)`
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      text-align: center;
      font-weight: ${t.typography.fontWeightBold};
    `,modal:(0,a.css)`
      height: 100%;
    `,modalContent:(0,a.css)`
      flex: 1;
      display: flex;
      flex-direction: column;
    `,modalAlert:(0,a.css)`
      flex-grow: 0;
    `,warnIcon:(0,a.css)`
      fill: ${t.colors.warning.main};
    `,labels:(0,a.css)`
      justify-content: flex-start;
    `,alertFolder:(0,a.css)`
      height: 20px;
      font-size: ${t.typography.bodySmall.fontSize};
      color: ${t.colors.text.secondary};
      display: flex;
      flex-direction: row;
      justify-content: flex-start;
      column-gap: ${t.spacing(1)};
      align-items: center;
    `}},Ie=[{name:"Receiver",type:"string",notes:"Name of the contact point that the notification is being sent to."},{name:"Status",type:"string",notes:"firing if at least one alert is firing, otherwise resolved"},{name:"Alerts",type:"[]Alert",notes:"List of alert objects that are included in this notification."},{name:"Alerts.Firing",type:"[]Alert",notes:"List of firing alerts"},{name:"Alerts.Resolved",type:"[]Alert",notes:"List of resolved alerts"},{name:"GroupLabels",type:"KeyValue",notes:"Labels these alerts were grouped by."},{name:"CommonLabels",type:"KeyValue",notes:"Labels common to all the alerts included in this notification."},{name:"CommonAnnotations",type:"KeyValue",notes:"Annotations common to all the alerts included in this notification."},{name:"ExternalURL",type:"string",notes:"Back link to the Grafana that sent the notification."}],Be=[{name:"Labels",type:"KeyValue",notes:"Set of labels attached to the alert."},{name:"Annotations",type:"KeyValue",notes:"Set of annotations attached to the alert."},{name:"StartsAt",type:"time.Time",notes:"Time the alert started firing."},{name:"EndsAt",type:"time.Time",notes:"Time the alert ends firing."}],Ke=[{name:"Status",type:"string",notes:"firing or resolved."},{name:"Labels",type:"KeyValue",notes:"Set of labels attached to the alert."},{name:"Annotations",type:"KeyValue",notes:"Set of annotations attached to the alert."},{name:"Values",type:"KeyValue",notes:"The values of all instant queries, reduce and math expressions, and classic conditions for the alert. It does not contain time series data."},{name:"StartsAt",type:"time.Time",notes:"Time the alert started firing."},{name:"EndsAt",type:"time.Time",notes:"Only set if the end time of an alert is known. Otherwise set to a configurable timeout period from the time since the last alert was received."},{name:"GeneratorURL",type:"string",notes:"A back link to Grafana or external Alertmanager."},{name:"SilenceURL",type:"string",notes:"Link to Grafana silence for with labels for this alert pre-filled. Only for Grafana managed alerts."},{name:"DashboardURL",type:"string",notes:"Link to Grafana dashboard, if alert rule belongs to one. Only for Grafana managed alerts."},{name:"PanelURL",type:"string",notes:"Link to Grafana dashboard panel, if alert rule belongs to one. Only for Grafana managed alerts."},{name:"Fingerprint",type:"string",notes:"Fingerprint that can be used to identify the alert."},{name:"ValueString",type:"string",notes:"String that contains the labels and value of each reduced expression in the alert."}],Me=[{name:"SortedPairs",returns:"KeyValue",notes:"Returns sorted list of key & value string pairs"},{name:"Remove",args:"[]string",returns:"KeyValue",notes:"Returns a copy of the Key/Value map without the given keys."},{name:"Names",returns:"[]string",notes:"List of label names"},{name:"Values",returns:"[]string",notes:"List of label values"}],Ve=`{
  "summary": "alert summary",
  "description": "alert description"
}
`;var ye=n(35108);function Ge(){const t=(0,R.of)(We),r=e.createElement(ce,{caption:e.createElement("h4",{className:t.header},"Alert template data ",e.createElement("span",null,"Available only when in the context of an Alert (e.g. inside .Alerts loop)")),dataItems:Ke});return e.createElement(u.B,{gap:2},e.createElement(ce,{caption:e.createElement("h4",{className:t.header},"Template Data"),dataItems:Ie,typeRenderer:m=>m==="[]Alert"?e.createElement(ye.j,{content:r},e.createElement("div",{className:t.interactiveType},m)):m==="KeyValue"?e.createElement(ye.j,{content:e.createElement(Ue,null)},e.createElement("div",{className:t.interactiveType},m)):m}))}const We=t=>({header:(0,a.css)`
    color: ${t.colors.text.primary};

    span {
      color: ${t.colors.text.secondary};
      font-size: ${t.typography.bodySmall.fontSize};
    }
  `,interactiveType:(0,a.css)`
    color: ${t.colors.text.link};
  `});function ce({dataItems:t,caption:r,typeRenderer:m}){const o=(0,R.of)(ve);return e.createElement("table",{className:o.table},e.createElement("caption",null,r),e.createElement("thead",null,e.createElement("tr",null,e.createElement("th",null,"Name"),e.createElement("th",null,"Type"),e.createElement("th",null,"Notes"))),e.createElement("tbody",null,t.map(({name:i,type:v,notes:c},p)=>e.createElement("tr",{key:p},e.createElement("td",null,i),e.createElement("td",null,m?m(v):v),e.createElement("td",null,c)))))}function Ue(){const t=(0,R.of)(ve);return e.createElement("div",null,"KeyValue is a set of key/value string pairs that represent labels and annotations.",e.createElement("pre",null,e.createElement("code",null,Ve)),e.createElement("table",{className:t.table},e.createElement("caption",null,"Key-value methods"),e.createElement("thead",null,e.createElement("tr",null,e.createElement("th",null,"Name"),e.createElement("th",null,"Arguments"),e.createElement("th",null,"Returns"),e.createElement("th",null,"Notes"))),e.createElement("tbody",null,Me.map(({name:r,args:m,returns:o,notes:i})=>e.createElement("tr",{key:r},e.createElement("td",null,r),e.createElement("td",null,m),e.createElement("td",null,o),e.createElement("td",null,i))))))}const ve=t=>({table:(0,a.css)`
    border-collapse: collapse;
    width: 100%;

    caption {
      caption-side: top;
    }

    td,
    th {
      padding: ${t.spacing(1,1)};
    }

    thead {
      font-weight: ${t.typography.fontWeightBold};
    }

    tbody tr:nth-child(2n + 1) {
      background-color: ${t.colors.background.secondary};
    }

    tbody td:nth-child(1) {
      font-weight: ${t.typography.fontWeightBold};
    }

    tbody td:nth-child(2) {
      font-style: italic;
    }
  `});var je=n(10860),ke=n(94354),ze=n(31099),Je=n(54749);const He={annotations:[{key:"",value:""}],labels:[{key:"",value:""}],status:"firing"},Ye=({isOpen:t,onDismiss:r,onAccept:m})=>{const o=(0,R.of)(Ze),[i,v]=(0,e.useState)([]),c=(0,y.mN)({defaultValues:He,mode:"onBlur"}),p=c.watch("annotations"),F=c.watch("labels"),[D,L]=(0,e.useState)("firing"),G=()=>{const w={annotations:p.filter(({key:N,value:E})=>!!N&&!!E).reduce((N,{key:E,value:x})=>({...N,[E]:x}),{}),labels:F.filter(({key:N,value:E})=>!!N&&!!E).reduce((N,{key:E,value:x})=>({...N,[E]:x}),{}),startsAt:"2023-04-01T00:00:00Z",endsAt:D==="firing"?(0,U.f)(new Date,1).toISOString():M(new Date,1).toISOString()};v(N=>[...N,w]),c.reset()},I=()=>{m(i),v([]),c.reset(),L("firing")},B=()=>{const w=F.some(E=>E.key!==""&&E.value!==""),N=p.some(E=>E.key!==""&&E.value!=="");return w||N},A=[{label:"Firing",value:"firing"},{label:"Resolved",value:"resolved"}];return e.createElement(ae.a,{onDismiss:r,isOpen:t,title:"Add custom alerts"},e.createElement(y.Op,{...c},e.createElement("form",{onSubmit:w=>{w.preventDefault(),w.stopPropagation(),c.reset(),L("firing")}},e.createElement(e.Fragment,null,e.createElement(je.Z,null,e.createElement(u.B,{direction:"column",gap:1},e.createElement("div",{className:o.section},e.createElement(ze.A,null)),e.createElement("div",{className:o.section},e.createElement(Je.A,null)),e.createElement("div",{className:o.flexWrapper},e.createElement(ke.z,{value:D,options:A,onChange:w=>L(w)}),e.createElement(s.$n,{onClick:G,className:o.onAddButton,icon:"plus-circle",type:"button",variant:"secondary",disabled:!B()},"Add alert data"))))),e.createElement("div",{className:o.onSubmitWrapper}),i.length>0&&e.createElement(u.B,{direction:"column",gap:1},e.createElement("h5",null," Review alert data to add to the payload:"),e.createElement("pre",{className:o.result,"data-testid":"payloadJSON"},JSON.stringify(i,null,2))),e.createElement("div",{className:o.onSubmitWrapper},e.createElement(ae.a.ButtonRow,null,e.createElement(s.$n,{onClick:I,disabled:i.length===0,className:o.onSubmitButton},"Add alert data to payload"))))))},Ze=t=>({section:(0,a.css)`
    margin-bottom: ${t.spacing(2)};
  `,onAddButton:(0,a.css)`
    flex: none;
    width: fit-content;
    padding-right: ${t.spacing(1)};
    margin-left: auto;
  `,flexWrapper:(0,a.css)`
    display: flex;
    flex-direction: row,
    justify-content: space-between;
  `,onSubmitWrapper:(0,a.css)`
    display: flex;
    flex-direction: row;
    align-items: baseline;
    justify-content: flex-end;
  `,onSubmitButton:(0,a.css)`
    margin-left: ${t.spacing(2)};
  `,result:(0,a.css)`
    width: 570px;
    height: 363px;
  `}),Qe="Reset to default";function Xe({payload:t,setPayload:r,defaultPayload:m,setPayloadFormatError:o,payloadFormatError:i,onPayloadError:v}){const c=(0,R.of)(Ee),p=()=>{r(m)},[F,D]=(0,e.useState)(!1),L=()=>{D(!1)},G=i!==null,I=()=>{try{const x=JSON.parse(t);JSON.stringify([...x]),o(null)}catch(x){throw o(x instanceof Error?x.message:"Invalid JSON."),v(),x}},B=()=>{try{I(),D(!0)}catch{}},A=()=>{try{I(),E(!0)}catch{}},w=x=>{L(),E(!1),r(_=>{const ee=JSON.parse(_);return JSON.stringify([...ee,...x],void 0,2)})},[N,E]=(0,e.useState)(!1);return e.createElement("div",{className:c.wrapper},e.createElement("div",{className:c.editor},e.createElement("div",{className:c.title},"Payload data",e.createElement(pe.m,{placement:"top",content:e.createElement(qe,null),theme:"info"},e.createElement(ge.I,{name:"info-circle",className:c.tooltip,size:"xl"}))),e.createElement(h.Ay,{disableHeight:!0},({width:x})=>e.createElement("div",{className:c.editorWrapper},e.createElement(we.B,{width:x,height:362,language:"json",showLineNumbers:!0,showMiniMap:!1,value:t,readOnly:!1,onBlur:r}))),e.createElement("div",{className:c.buttonsWrapper},e.createElement(s.$n,{type:"button",variant:"secondary",className:c.button,icon:"bell",disabled:G,onClick:A},"Select alert instances"),e.createElement(s.$n,{onClick:B,className:c.button,icon:"plus-circle",type:"button",variant:"secondary",disabled:G},"Add custom alerts"),e.createElement(s.$n,{onClick:p,className:c.button,icon:"arrow-up",type:"button",variant:"destructive"},Qe),i!==null&&e.createElement(Re.E,{color:"orange",icon:"exclamation-triangle",text:"JSON Error",tooltip:"Fix errors in payload, and click Refresh preview button"}))),e.createElement(Ye,{isOpen:F,onDismiss:L,onAccept:w}),e.createElement(Pe,{onSelect:w,isOpen:N,onClose:()=>E(!1)}))}const qe=()=>{const t=(0,R.of)(Ee);return e.createElement(ce,{caption:e.createElement("h4",{className:t.templateDataDocsHeader},"Alert template data ",e.createElement("span",null,"This is the list of alert data fields used in the preview.")),dataItems:Be})},Ee=t=>({jsonEditor:(0,a.css)`
    width: 100%;
    height: 100%;
  `,buttonsWrapper:(0,a.css)`
    margin-top: ${t.spacing(1)};
    display: flex;
    flex-wrap: wrap;
  `,button:(0,a.css)`
    flex: none;
    width: fit-content;
    padding-right: ${t.spacing(1)};
    margin-right: ${t.spacing(1)};
    margin-bottom: ${t.spacing(1)};
  `,title:(0,a.css)`
    font-weight: ${t.typography.fontWeightBold};
    heigth: 41px;
    padding-top: 10px;
    padding-left: ${t.spacing(2)};
    margin-top: 19px;
  `,wrapper:(0,a.css)`
    flex: 1;
    min-width: 450px;
  `,tooltip:(0,a.css)`
    padding-left: ${t.spacing(1)};
  `,editorWrapper:(0,a.css)`
    width: min-content;
    padding-top: 7px;
  `,editor:(0,a.css)`
    display: flex;
    flex-direction: column;
    margin-top: ${t.spacing(-1)};
  `,templateDataDocsHeader:(0,a.css)`
    color: ${t.colors.text.primary};

    span {
      color: ${t.colors.text.secondary};
      font-size: ${t.typography.bodySmall.fontSize};
    }
  `});var _e=n(96615),et=n(57954);const tt=Object.freeze({name:"",content:""}),nt=t=>t.pathname.endsWith("/duplicate"),Se=`[
  {
    "annotations": {
      "summary": "Instance instance1 has been down for more than 5 minutes"
    },
    "labels": {
      "instance": "instance1"
    },
    "startsAt": "${M(new Date,1).toISOString()}"
  }]
`,at=({existing:t,alertManagerSourceName:r,config:m,provenance:o})=>{const i=(0,R.of)(de),v=(0,V.useDispatch)();(0,S.o)(d=>d.unifiedAlerting.saveAMConfig=Ne.jA);const{loading:c,error:p}=(0,xe.$)(d=>d.saveAMConfig),F=(0,P.zy)(),D=nt(F),[L,G]=(0,e.useState)(Se),[I,B]=(0,e.useState)(null),[A,w]=(0,e.useState)("content"),N=()=>w("preview"),E=d=>{const O=(0,Ce.o)(d.name,d.content),J={...m.template_files,[d.name]:O};t&&t.name!==d.name&&delete J[t.name];const Q=[...(m.alertmanager_config.templates??[]).filter(H=>H!==t?.name),d.name],re={template_files:J,alertmanager_config:{...m.alertmanager_config,templates:Q}};v((0,Te.RW)({alertManagerSourceName:r,newConfig:re,oldConfig:m,successMessage:"Template saved.",redirectPath:"/alerting/notifications"}))},x=(0,y.mN)({mode:"onSubmit",defaultValues:t??tt}),{handleSubmit:_,register:ee,formState:{errors:Z},getValues:le,setValue:oe,watch:se}=x,g=d=>!m.template_files[d]||t?.name===d?!0:"Another template with this name already exists.",f=r===me.hY;return e.createElement(y.Op,{...x},e.createElement("form",{onSubmit:_(E)},e.createElement("h4",null,t&&!D?"Edit notification template":"Create notification template"),p&&e.createElement(k.F,{severity:"error",title:"Error saving template"},p.message||(0,j.NF)(p)&&p.data?.message||String(p)),o&&e.createElement(ue.Yi,{resource:ue.hk.Template}),e.createElement(ne.n,{disabled:!!o},e.createElement(z.D,{label:"Template name",error:Z?.name?.message,invalid:!!Z.name?.message,required:!0},e.createElement(X.p,{...ee("name",{required:{value:!0,message:"Required."},validate:{nameIsUnique:g}}),placeholder:"Give your template a name",width:42,autoFocus:!0})),e.createElement(lt,null),e.createElement("div",{className:i.editorsWrapper},e.createElement("div",{className:i.contentContainer},e.createElement(C.U,null,e.createElement(l.o,{label:"Content",active:A==="content",onChangeTab:()=>w("content")}),f&&e.createElement(l.o,{label:"Preview",active:A==="preview",onChangeTab:()=>w("preview")})),e.createElement("div",{className:i.contentContainerEditor},e.createElement(h.Ay,null,({width:d})=>e.createElement(e.Fragment,null,A==="content"?e.createElement("div",null,e.createElement(z.D,{error:Z?.content?.message,invalid:!!Z.content?.message,required:!0},e.createElement("div",{className:i.editWrapper},e.createElement(_e.K,{value:le("content"),width:d,height:363,onBlur:O=>oe("content",O)}))),e.createElement("div",{className:i.buttons},c&&e.createElement(s.$n,{disabled:!0,icon:"spinner",variant:"primary"},"Saving..."),!c&&e.createElement(s.$n,{type:"submit",variant:"primary"},"Save template"),e.createElement(s.z9,{disabled:c,href:(0,Le.nL)("alerting/notifications",r),variant:"secondary",type:"button"},"Cancel"))):e.createElement(ct,{width:d,payload:L,templateName:se("name"),setPayloadFormatError:B,payloadFormatError:I}))))),f&&e.createElement(Xe,{payload:L,setPayload:G,defaultPayload:Se,setPayloadFormatError:B,payloadFormatError:I,onPayloadError:N}))),e.createElement(b.M,{label:"Data cheat sheet",isOpen:!1,className:i.collapsableSection},e.createElement(Ge,null))))};function lt(){const t=(0,R.of)(de);return e.createElement(k.F,{title:"Templating guideline",severity:"info"},e.createElement(u.B,{direction:"row"},e.createElement("div",null,"Grafana uses Go templating language to create notification messages.",e.createElement("br",null),"To find out more about templating please visit our documentation."),e.createElement("div",null,e.createElement(s.z9,{href:"https://grafana.com/docs/grafana/latest/alerting/manage-notifications/template-notifications/",target:"_blank",icon:"external-link-alt",variant:"secondary"},"Templating documentation"))),e.createElement("div",{className:t.snippets},"To make templating easier, we provide a few snippets in the content editor to help you speed up your workflow.",e.createElement("div",{className:t.code},Object.values(et.L).map(r=>r.label).join(", "))))}function ot(t){const r=t.filter(i=>i.text.trim().length>0),m=r.length>1,o=i=>{const v=`Preview for ${i.name}:`,c="=".repeat(v.length).concat(">"),p="<".concat("=".repeat(v.length));return m?`${v}
${c}${i.text}${p}
`:`${c}${i.text}${p}
`};return r.map(i=>o(i)).join(`
`)}function st(t){return t.map(r=>r.name?`ERROR in ${r.name}:
`.concat(`${r.kind}
${r.message}
`):`ERROR:
${r.kind}
${r.message}
`).join(`
`)}const rt="Preview request failed. Check if the payload data has the correct structure.";function it(t,r,m){const o=t?rt:void 0,i=t||!!r,v=r||o,c=m?.results,p=m?.errors,F=c?ot(c):"",D=p?st(p):"";return i?v:`${F}
${D}`}function ct({payload:t,templateName:r,payloadFormatError:m,setPayloadFormatError:o,width:i}){const v=(0,R.of)(de),{watch:c}=(0,y.xW)(),p=c("content"),[F,{data:D,isError:L,isLoading:G}]=Ae(),I=it(L,m,D),B=(0,e.useCallback)(()=>{try{const A=JSON.parse(t);JSON.stringify([...A]),F({template:p,alerts:A,name:r}),o(null)}catch(A){o(A instanceof Error?A.message:"Invalid JSON.")}},[p,r,t,o,F]);return(0,e.useEffect)(()=>B(),[B]),e.createElement("div",{style:{width:`${i}px`},className:v.preview.wrapper},G&&e.createElement(e.Fragment,null,e.createElement(T.y,{inline:!0})," Loading preview..."),e.createElement("pre",{className:v.preview.result,"data-testid":"payloadJSON"},I),e.createElement(s.$n,{onClick:B,className:v.preview.button,icon:"arrow-up",type:"button",variant:"secondary"},"Refresh preview"))}const de=t=>({contentContainer:(0,a.css)`
    flex: 1;
    margin-bottom: ${t.spacing(6)};
  `,contentContainerEditor:(0,a.css)`
      flex:1;
      display: flex;
      padding-top: 10px;
      gap: ${t.spacing(2)};
      flex-direction: row;
      align-items: flex-start;
      flex-wrap: wrap;
      ${t.breakpoints.up("xxl")} {
        flex - wrap: nowrap;
    }
      min-width: 450px;
      height: 363px;
      `,snippets:(0,a.css)`
    margin-top: ${t.spacing(2)};
    font-size: ${t.typography.bodySmall.fontSize};
  `,code:(0,a.css)`
    color: ${t.colors.text.secondary};
    font-weight: ${t.typography.fontWeightBold};
  `,buttons:(0,a.css)`
    display: flex;
    & > * + * {
      margin-left: ${t.spacing(1)};
    }
    margin-top: -7px;
  `,textarea:(0,a.css)`
    max-width: 758px;
  `,editWrapper:(0,a.css)`
      display: flex;
      width: 100%
      heigth:100%;
      position: relative;
      `,toggle:(0,a.css)`
      color: theme.colors.text.secondary,
      marginRight: ${t.spacing(1)}`,preview:{wrapper:(0,a.css)`
      display: flex;
      width: 100%
      heigth:100%;
      position: relative;
      flex-direction: column;
      `,result:(0,a.css)`
      width: 100%;
      height: 363px;
    `,button:(0,a.css)`
      flex: none;
      width: fit-content;
      margin-top: -6px;
    `},collapsableSection:(0,a.css)`
    width: fit-content;
  `,editorsWrapper:(0,a.css)`
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: ${t.spacing(1)};
  `})},57954:(te,W,n)=>{n.d(W,{So:()=>R,J2:()=>k,Xt:()=>j,KS:()=>ne,Mq:()=>X,L:()=>z});const a=`
{{ range .Alerts }}
  Status: {{ .Status }}
  Starts at: {{ .StartsAt }}
{{ end }}
`,U=`
[{{.Status}}] {{ .Labels.alertname }}

Labels:
{{ range .Labels.SortedPairs }}
  {{ .Name }}: {{ .Value }}
{{ end }}

{{ if gt (len .Annotations) 0 }}
Annotations:
{{ range .Annotations.SortedPairs }}
  {{ .Name }}: {{ .Value }}
{{ end }}
{{ end }}

{{ if gt (len .SilenceURL ) 0 }}
  Silence alert: {{ .SilenceURL }}
{{ end }}
{{ if gt (len .DashboardURL ) 0 }}
  Go to dashboard: {{ .DashboardURL }}
{{ end }}
`,M=h("GroupLabels.SortedPairs"),$=h("CommonLabels.SortedPairs"),e=h("CommonAnnotations.SortedPairs"),y=h("Labels.SortedPairs"),P=h("Annotations.SortedPairs");function h(C){return`
{{ range .${C} }}
  {{ .Name }} = {{ .Value }}
{{ end }}`}function j(C){const l=C.languages.CompletionItemKind.Field;return[{label:"Alerts",kind:l,detail:"Alert[]",documentation:{value:"An Array containing all alerts"}},{label:"Receiver",kind:l,detail:"string"},{label:"Status",kind:l,detail:"string"},{label:"GroupLabels",kind:l,detail:"[]KeyValue"},{label:"CommonLabels",kind:l,detail:"[]KeyValue"},{label:"CommonAnnotations",kind:l,detail:"[]KeyValue"},{label:"ExternalURL",kind:l,detail:"string"}]}function R(C){const l=C.languages.CompletionItemKind.Field;return[{label:{label:"Status",detail:"(Alert)",description:"string"},kind:l,detail:"string",documentation:{value:"Status of the alert. It can be `firing` or `resolved`"}},{label:{label:"Labels",detail:"(Alert)"},kind:l,detail:"[]KeyValue",documentation:{value:"A set of labels attached to the alert."}},{label:{label:"Annotations",detail:"(Alert)"},kind:l,detail:"[]KeyValue",documentation:"A set of annotations attached to the alert."},{label:{label:"StartsAt",detail:"(Alert)"},kind:l,detail:"time.Time",documentation:"Time the alert started firing."},{label:{label:"EndsAt",detail:"(Alert)"},kind:l,detail:"time.Time",documentation:"Only set if the end time of an alert is known. Otherwise set to a configurable timeout period from the time since the last alert was received."},{label:{label:"GeneratorURL",detail:"(Alert)"},kind:l,detail:"string",documentation:"Back link to Grafana or external Alertmanager."},{label:{label:"SilenceURL",detail:"(Alert)"},kind:l,detail:"string",documentation:"Link to Grafana silence for with labels for this alert pre-filled. Only for Grafana managed alerts."},{label:{label:"DashboardURL",detail:"(Alert)"},kind:l,detail:"string",documentation:"Link to Grafana dashboard, if alert rule belongs to one. Only for Grafana managed alerts."},{label:{label:"PanelURL",detail:"(Alert)"},kind:l,detail:"string",documentation:"Link to Grafana dashboard panel, if alert rule belongs to one. Only for Grafana managed alerts."},{label:{label:"Fingerprint",detail:"(Alert)"},kind:l,detail:"string",documentation:"Fingerprint that can be used to identify the alert."},{label:{label:"ValueString",detail:"(Alert)"},kind:l,detail:"string",documentation:"String that contains labels and values of each reduced expression in the alert."}]}function k(C){const l=C.languages.CompletionItemKind.Field;return[{label:"Firing",kind:l,detail:"Alert[]"},{label:"Resolved",kind:l,detail:"Alert[]"}]}function ne(C){const l=C.languages.CompletionItemKind.Field;return[{label:"SortedPairs",kind:l,detail:"[]KeyValue"},{label:"Names",kind:l,detail:"[]string"},{label:"Values",kind:l,detail:"[]string"},{label:"Remove",detail:"KeyValue[] function(keys []string)",kind:C.languages.CompletionItemKind.Method}]}const z={alerts:{label:"alertsloop",description:"Renders a loop through alerts",snippet:a},alertDetails:{label:"alertdetails",description:"Renders all information available about the alert",snippet:U},groupLabels:{label:"grouplabelsloop",description:"Renders a loop through group labels",snippet:M},commonLabels:{label:"commonlabelsloop",description:"Renders a loop through common labels",snippet:$},commonAnnotations:{label:"commonannotationsloop",description:"Renders a loop through common annotations",snippet:e},labels:{label:"labelsloop",description:"Renders a loop through labels",snippet:y},annotations:{label:"annotationsloop",description:"Renders a loop through annotations",snippet:P}};function X(C){const l=C.languages.CompletionItemKind.Snippet,s=C.languages.CompletionItemInsertTextRule.InsertAsSnippet,{alerts:b,alertDetails:u,groupLabels:T,commonLabels:S,commonAnnotations:V,labels:K,annotations:Y}=z;return[{label:b.label,documentation:b.description,kind:l,insertText:b.snippet,insertTextRules:s},{label:{label:u.label,detail:"(Alert)"},documentation:u.description,kind:l,insertText:u.snippet,insertTextRules:s},{label:T.label,documentation:T.description,kind:l,insertText:T.snippet,insertTextRules:s},{label:S.label,documentation:S.description,kind:l,insertText:S.snippet,insertTextRules:s},{label:V.label,documentation:V.description,kind:l,insertText:V.snippet,insertTextRules:s},{label:{label:K.label,detail:"(Alert)"},documentation:K.description,kind:l,insertText:K.snippet,insertTextRules:s},{label:{label:Y.label,detail:"(Alert)"},documentation:Y.description,kind:l,insertText:Y.snippet,insertTextRules:s}]}},70026:(te,W,n)=>{n.d(W,{$:()=>M,Q:()=>$});var a=n(2543),U=n.n(a);function M(e,y){return e.filter(P=>!y.find(h=>JSON.stringify(h)===JSON.stringify(P)))}function $(e){const y=e.flatMap(h=>h);return(0,a.uniqBy)(y.filter(h=>y.filter(R=>(0,a.isEqual)(h,R)).length===Object.keys(e).length),h=>JSON.stringify(h))}},5586:(te,W,n)=>{n.d(W,{a:()=>$,o:()=>M});var a=n(2543),U=n.n(a);function M(e,y){let P=y.trim();if(!P.match(/\{\{\s*define/)){const h=P.split(`
`).map(j=>"  "+j).join(`
`);P=`{{ define "${e}" }}
${h}
{{ end }}`}return P}function $(e){const y=(P,h)=>`{{ define "${h}_NEW_${(0,a.now)()}" }}`;return e.replace(/\{\{\s*define\s*\"(?<defineName>.*)\"\s*\}\}/g,y)}}}]);

//# sourceMappingURL=3407.666eb88a718e66b93f72.js.map