"use strict";(self.webpackChunkgrafana=self.webpackChunkgrafana||[]).push([[6359],{37811:(W,U,n)=>{n.d(U,{A:()=>i});function i(S){S.getRowProps.push(w=>[w,R()]),S.getHeaderGroupProps.push(w=>[w,R()]),S.getFooterGroupProps.push(w=>[w,R()]),S.getHeaderProps.push((w,{column:M})=>[w,e(M)]),S.getCellProps.push((w,{cell:M})=>[w,e(M.column)]),S.getFooterProps.push((w,{column:M})=>[w,e(M)])}i.pluginName="useCustomFlexLayout";function e(S){return{style:{flex:S.totalWidth===0?"0 0 auto":`${S.totalWidth} 0 0`}}}function R(){return{style:{display:"flex",flex:"1 0 auto"}}}},66359:(W,U,n)=>{n.d(U,{P:()=>Q});var i=n(32196),e=n(96540),R=n(32885),S=n(91793),w=n(10022),M=n(52622),z=n(40845),q=n(49618),_=n(69770),ee=n(37811),te=n(97427),B=n(70255),ae=n(11261),le=n(57875),ne=n(28240),se=n(83195),j=n(32264),oe=n(19347),J=n(10880),V=n(14578),re=n(94753),Y=n(64149),ce=n(28138),F=n(44836),ie=n(66253),de=n(28444),ue=n(40957),me=n(25897),fe=n(37390),ve=n(40980),K=n(32372),he=n(1819);const A=[{label:"Score",value:"score"},{label:"Fields",value:"fields"},{label:"Allowed actions",value:"allowed_actions"}];function ge({name:t,explain:a,frame:u,row:d}){const[m,s]=(0,e.useState)(!0),[v,y]=(0,e.useState)("score"),p=e.createElement(me.J,{title:t,icon:"info",tabs:A,activeTab:v,onChangeTab:o=>{y(o.value)}});return e.createElement(fe.a,{title:p,isOpen:m,onDismiss:()=>s(!1),closeOnBackdropClick:!0,closeOnEscape:!0},e.createElement(ve.J,null,v===A[0].value&&e.createElement(K.B,{width:"100%",height:"70vh",language:"json",showLineNumbers:!1,showMiniMap:!0,value:JSON.stringify(a,null,2),readOnly:!1}),v===A[1].value&&e.createElement("div",null,e.createElement(he.e,{data:u,rowIndex:d})),v===A[2].value&&e.createElement(K.B,{width:"100%",height:"70vh",language:"json",showLineNumbers:!1,showMiniMap:!1,value:(()=>{const o=u.fields.find(h=>h.name==="allowed_actions")?.values?.[d],l=u.fields.find(h=>h.name==="ds_uid")?.values?.[d];return JSON.stringify({dsUids:l??[],allowedActions:o??[]},null,2)})(),readOnly:!1})))}const pe=175,xe=200,we=(t,a,u,d,m,s,v,y,p)=>{const o=[],l=t.view.fields,h=l.uid,P=l.kind;let E=0;const C=l[t.view.dataFrame.meta?.custom?.sortBy];C&&(E=175,C.type===ae.PU.time&&(E+=25),a-=E),l.explain&&l.score&&(a-=100);let g=50;u&&d&&(g=0,o.push({id:"column-checkbox",width:g,Header:()=>{const{view:c}=t,f=u("*","*"),r=c.every(x=>u(x.kind,x.uid));return e.createElement(J.S,{indeterminate:!r&&f,checked:r,disabled:!t,onChange:x=>{if(f)m();else for(let L=0;L<c.length;L++){const T=c.get(L);d(T.kind,T.uid)}}})},Cell:c=>{const f=h.values[c.row.index],r=P?P.values[c.row.index]:"dashboard",x=u(r,f),L=f!=null;return e.createElement("div",{...c.cellProps,className:s.cell},e.createElement(J.S,{disabled:!L,value:x&&L,onChange:T=>{d(r,f)}}))},field:h}),a-=g),g=Math.max(a*.2,300),o.push({Cell:c=>{let f=(0,i.cx)(s.nameCellStyle),r=l.name.values[c.row.index];return r?.length||(r=c.row.index>=t.view.dataFrame.length?"Loading...":"Missing title",f+=" "+s.missingTitleText),e.createElement("div",{className:s.cell,...c.cellProps},t.isItemLoaded(c.row.index)?e.createElement("a",{href:c.userProps.href,onClick:c.userProps.onClick,className:f,title:r},r):e.createElement(B.A,{width:200}))},id:"column-name",field:l.name,Header:()=>e.createElement("div",null,(0,F.t)("search.results-table.name-header","Name")),width:g}),a-=g,g=pe,o.push(Ce(t,l.kind,l.panel_type,g,s)),a-=g,l.ds_uid&&y&&(g=Math.min(a/2.5,xe),o.push(Ee(l.ds_uid,g,s.typeIcon,s.datasourceItem,s.invalidDatasourceItem,y)),a-=g);const D=!p||ye(t.view.fields.tags),k=t.view.dataFrame.meta?.custom;if(k?.locationInfo&&a>0&&(g=D?Math.max(a/1.75,300):a,a-=g,o.push({Cell:c=>{const f=(l.location?.values[c.row.index]??"").split("/");return e.createElement("div",{...c.cellProps,className:s.cell},t.isItemLoaded(c.row.index)?e.createElement("div",{className:s.locationContainer},f.map(r=>{let x=k.locationInfo[r];return!x&&r==="general"&&(x={kind:"folder",url:"/dashboards",name:"General"}),x?e.createElement("a",{key:r,href:x.url,className:s.locationItem},e.createElement(V.I,{name:(0,ue.TM)(x.kind)}),e.createElement(re.E,{variant:"body",truncate:!0},x.name)):e.createElement("span",{key:r},r)})):e.createElement(B.A,{width:150}))},id:"column-location",field:l.location??l.url,Header:(0,F.t)("search.results-table.location-header","Location"),width:g})),a>0&&D&&o.push(Se(t,l.tags,a,s,v)),C&&E){const c=C.display??(0,le.J)({field:C,theme:j.$.theme2});o.push({Header:(0,ne.Ct)(C),Cell:f=>e.createElement("div",{...f.cellProps,className:s.cell},Ie({sortField:C,getDisplay:c,index:f.row.index,kind:l.kind})),id:"column-sort-field",field:C,width:E})}if(l.explain&&l.score){const c=l.score.values,f=r=>{ce.A.publish(new de.S8({component:ge,props:{name:l.name.values[r],explain:l.explain.values[r],frame:t.view.dataFrame,row:r}}))};o.push({Header:()=>e.createElement("div",{className:s.sortedHeader},"Score"),Cell:r=>e.createElement("div",{...r.cellProps,className:(0,i.cx)(s.cell,s.explainItem),onClick:()=>f(r.row.index)},c[r.row.index]),id:"column-score-field",field:l.score,width:100})}return o};function ye(t){for(let a=0;a<t.values.length;a++)if(t.values[a]!=null)return!0;return!1}function Ee(t,a,u,d,m,s){const v=(0,oe.l)();return{id:"column-datasource",field:t,Header:(0,F.t)("search.results-table.datasource-header","Data source"),Cell:y=>{const p=t.values[y.row.index];return p?.length?e.createElement("div",{...y.cellProps,className:(0,i.cx)(d)},p.map((o,l)=>{const h=v.getInstanceSettings(o),P=h?.meta?.info?.logos?.small;return P?e.createElement("span",{key:l,onClick:E=>{E.stopPropagation(),E.preventDefault(),s(h.uid)}},e.createElement("img",{src:P,alt:"",width:14,height:14,title:h.type,className:u}),h.name):e.createElement("span",{className:m,key:l},o)})):null},width:a}}function Ce(t,a,u,d,m){return{id:"column-type",field:a??u,Header:(0,F.t)("search.results-table.type-header","Type"),Cell:s=>{const v=s.row.index,y=a?.values[v]??"dashboard";let p="apps",o="Dashboard";if(y)switch(o=y,o){case"dashboard":o=(0,F.t)("search.results-table.type-dashboard","Dashboard");break;case"folder":p="folder",o=(0,F.t)("search.results-table.type-folder","Folder");break;case"panel":p=`${ie.Ip.panel}`;const l=u.values[v];if(l){o=l;const h=j.$.panels[o];if(h?.name)o=h.name;else switch(l){case"row":o="Row",p="bars";break;case"singlestat":o="Singlestat";break;default:p="question-circle"}}break}return e.createElement("div",{...s.cellProps,className:(0,i.cx)(m.cell,m.typeCell)},t.isItemLoaded(s.row.index)?e.createElement(e.Fragment,null,e.createElement(V.I,{name:p,size:"sm",title:o,className:m.typeIcon}),o):e.createElement(B.A,{width:100}))},width:d}}function Se(t,a,u,d,m){return{Cell:s=>{const v=a.values[s.row.index];return e.createElement("div",{...s.cellProps,className:d.cell},t.isItemLoaded(s.row.index)?e.createElement(e.Fragment,null,v?e.createElement(Y.L,{className:d.tagList,tags:v,onClick:m}):null):e.createElement(Y.L.Skeleton,null))},id:"column-tags",field:a,Header:(0,F.t)("search.results-table.tags-header","Tags"),width:u}}function Ie({kind:t,sortField:a,index:u,getDisplay:d}){const m=a.values[u];return["folder","panel"].includes(t.values[u])&&m===0?"-":(0,se.cN)(d(m))}const G=36,Q=e.memo(({response:t,width:a,height:u,selection:d,selectionToggle:m,clearSelection:s,onTagSelected:v,onDatasourceChange:y,onClickItem:p,keyboardEvents:o})=>{const l=(0,z.of)(Ne),h=(0,z.of)(Pe),P=(0,_.k)((0,z.$j)(),M.qM.Sm),E=(0,e.useRef)(null),[C,g]=(0,e.useState)(null),D=(0,te.n)(o,0,t),k=(0,e.useMemo)(()=>t?.view?.dataFrame.fields.length?Array(t.totalRows).fill(0):[],[t]);(0,e.useEffect)(()=>{E.current&&E.current.resetloadMoreItemsCache(),C&&C.scrollTo(0)},[k,C]);const c=(0,e.useMemo)(()=>we(t,a,d,m,s,h,v,y,t.view?.length>=t.totalRows),[t,a,h,d,m,s,v,y]),f=(0,e.useMemo)(()=>({columns:c,data:k}),[c,k]),{getTableProps:r,getTableBodyProps:x,headerGroups:L,rows:T,prepareRow:X}=(0,R.useTable)(f,ee.A),Te=(0,e.useCallback)(async(I,$)=>{await t.loadMoreItems(I,$);const N=d?.("*","*");if(!(!m||!d||!N))for(let b=I;b<t.view.length;b++){const H=t.view.get(b);d(H.kind,H.uid)||m(H.kind,H.uid)}},[t,d,m]),He=(0,e.useCallback)(({index:I,style:$})=>{const N=T[I];X(N);const b=t.view.fields.url?.values[I];let H=l.rowContainer;return I===D.y&&(H+=" "+l.selectedRow),e.createElement("div",{...N.getRowProps({style:$}),className:H},N.cells.map((O,Z)=>e.createElement(q.n,{key:Z,tableStyles:P,cell:O,columnIndex:Z,columnCount:N.cells.length,userProps:{href:b,onClick:p},frame:t.view.dataFrame})))},[T,X,t.view.fields.url?.values,D,l,P,p,t.view.dataFrame]);return T.length?e.createElement("div",{...r(),"aria-label":"Search results table",role:"table"},L.map(I=>{const{key:$,...N}=I.getHeaderGroupProps({style:{width:a}});return e.createElement("div",{key:$,...N,className:l.headerRow},I.headers.map(b=>{const{key:H,...O}=b.getHeaderProps();return e.createElement("div",{key:H,...O,role:"columnheader",className:l.headerCell},b.render("Header"))}))}),e.createElement("div",{...x()},e.createElement(w.A,{ref:E,isItemLoaded:t.isItemLoaded,itemCount:T.length,loadMoreItems:Te},({onItemsRendered:I,ref:$})=>e.createElement(S.Y1,{ref:N=>{$(N),g(N)},onItemsRendered:I,height:u-G,itemCount:T.length,itemSize:P.rowHeight,width:a,style:{overflow:"hidden auto"}},He)))):e.createElement("div",{className:l.noData},"No data")});Q.displayName="SearchResultsTable";const Ne=t=>{const a=t.colors.emphasize(t.colors.background.primary,.03);return{noData:(0,i.css)`
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
    `,headerCell:(0,i.css)`
      align-items: center;
      display: flex;
      overflo: hidden;
      padding: ${t.spacing(1)};
    `,headerRow:(0,i.css)`
      background-color: ${t.colors.background.secondary};
      display: flex;
      gap: ${t.spacing(1)};
      height: ${G}px;
    `,selectedRow:(0,i.css)`
      background-color: ${a};
      box-shadow: inset 3px 0px ${t.colors.primary.border};
    `,rowContainer:(0,i.css)`
      display: flex;
      gap: ${t.spacing(1)};
      height: ${G}px;
      label: row;
      &:hover {
        background-color: ${a};
      }

      &:not(:hover) div[role='cell'] {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `}},Pe=t=>({cell:(0,i.css)({padding:t.spacing(1),overflow:"hidden",display:"flex",alignItems:"center"}),nameCellStyle:(0,i.css)`
      overflow: hidden;
      text-overflow: ellipsis;
      user-select: text;
      white-space: nowrap;
    `,typeCell:(0,i.css)({gap:t.spacing(.5)}),typeIcon:(0,i.css)`
      fill: ${t.colors.text.secondary};
    `,datasourceItem:(0,i.css)`
      span {
        &:hover {
          color: ${t.colors.text.link};
        }
      }
    `,missingTitleText:(0,i.css)`
      color: ${t.colors.text.disabled};
      font-style: italic;
    `,invalidDatasourceItem:(0,i.css)`
      color: ${t.colors.error.main};
      text-decoration: line-through;
    `,locationContainer:(0,i.css)({display:"flex",flexWrap:"nowrap",gap:t.spacing(1),overflow:"hidden"}),locationItem:(0,i.css)`
      align-items: center;
      color: ${t.colors.text.secondary};
      display: flex;
      flex-wrap: nowrap;
      gap: 4px;
      overflow: hidden;
    `,explainItem:(0,i.css)`
      cursor: pointer;
    `,tagList:(0,i.css)`
      justify-content: flex-start;
      flex-wrap: nowrap;
    `})}}]);

//# sourceMappingURL=6359.f824c85233ec703f8cea.js.map