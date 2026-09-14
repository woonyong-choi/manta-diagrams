import {LinkCalendarView} from 'product/src/view.ts';
import {frame, film, layout} from './host.mjs';
const settings = {autoIndexDates:true,googleCalendar:{calendar:null,defaultDurationMinutes:60,enabled:false,installationId:'',records:[],sourceProfileIds:[]},locale:'en',profiles:[{editable:false,enabled:true,folder:'Calendar',id:'calendar',name:'Calendar notes',properties:{allDay:'allDay',category:'category',end:'end',endTime:'endTime',start:'date',startTime:'startTime',title:'title'},recursive:true,tag:''}],showAgenda:true,timeFormat:'24-hour',weekStart:'monday'};
const entries = [[14,'Source notes','Learning'],[15,'System map','Project'],[16,'Example','Learning'],[18,'Review','Project'],[21,'Share','Project'],[24,'Follow up','Project']];
const events = entries.map(([day,title,category]) => {
  const date = `2026-09-${day}`, filePath = `Calendar/${title}.md`;
  return {allDay:false,category,editable:false,endDate:date,endTime:`${date}T10:30:00`,filePath,id:'calendar:'+filePath,kind:'event',origin:'profile',profileId:'calendar',sources:[{excerpt:'Frontmatter',filePath,line:0}],startDate:date,startTime:`${date}T10:00:00`,title};
});
const host = document.querySelector('#runtime');
host.className = 'runtime workspace-leaf-content';
const view = new LinkCalendarView({}, () => settings, () => ({diagnostics:[],events,revision:1}), {create:async()=>{},move:async()=>{},open:async()=>{},openSettings(){},setup(){}});
view.contentEl.classList.add('view-content');host.append(view.contentEl);
await view.onOpen();
// Select through the product's date/path controls; sample dates never depend on capture day.
view.revealPath(events[0].filePath);
const firstDay = () => view.contentEl.querySelector('[role="gridcell"][aria-label^="2026-09-14"]').click();
firstDay();await layout();
const frames = [frame(host, 0, 'Pick a date. Find the note.')];
for (const [index, day] of [15,16,18,21,24].entries()) {
  view.contentEl.querySelector(`[role="gridcell"][aria-label^="2026-09-${day}"]`).click();
  frames.push(frame(host, .55 + index*.68, 'Your notes, one day at a time.'));
}
view.contentEl.querySelector('[role="gridcell"][aria-label^="2026-09-18"]').click();
frames.push(frame(host, 4.35, 'Come back to what matters.'));
firstDay();frames.push({...frames[0], at:5.6});
await view.onClose();film(frames);
