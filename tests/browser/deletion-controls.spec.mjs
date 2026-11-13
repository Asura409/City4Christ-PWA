import { test, expect } from '@playwright/test';
import { mocked, ID, SERMON, GROUP, STAFF_ACCESS } from './fixtures/api.mjs';
const CONVERSATION='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', MESSAGE='12121212-1212-4212-8212-121212121212';

async function sermons(page, failure = '') {
  await mocked(page,{signedIn:true,access:STAFF_ACCESS});
  let entry={id:SERMON,title:'Hope for today',speaker:'Pastor Joy',status:'published',version:1,preachedAt:'2026-11-08T10:00:00Z'}, fail=failure;
  const writes=[];
  await page.route('**/api/v1/admin/sermons**',async route=>{
    const request=route.request();
    if(request.method()==='PATCH'){
      const body=request.postDataJSON();writes.push(body);
      if(fail){const code=fail==='conflict'?409:503;return route.fulfill({status:code,json:{error:{code:fail,message:fail==='conflict'?'This sermon changed.':'Could not save this change.'}}})}
      entry={...entry,...body,version:entry.version+1};return route.fulfill({json:{data:entry}});
    }
    const status=new URL(request.url()).searchParams.get('status');
    return route.fulfill({json:{data:!status||entry.status===status?[entry]:[],meta:{nextCursor:''}}});
  });
  return {writes,recover(){fail='';entry={...entry,version:2}}};
}

test('editor confirms unpublish and the sermon becomes a draft',async({page})=>{
  const fixture=await sermons(page);await page.goto('/#/admin/sermons');
  const list=page.getByRole('region',{name:'Sermon editorial list'}), row=list.locator('.editorial-sermon-item');
  await expect(row).toContainText('Hope for today');
  page.once('dialog',d=>d.dismiss());await row.getByRole('button',{name:'Unpublish',exact:true}).click();expect(fixture.writes).toHaveLength(0);
  page.once('dialog',d=>d.accept());await row.getByRole('button',{name:'Unpublish',exact:true}).click();
  await expect(list.getByRole('status')).toContainText('Sermon unpublished');
  await expect(row.locator('.editorial-sermon-status')).toHaveText('Draft');
  expect(fixture.writes).toEqual([{version:1,status:'draft'}]);
  await expect(row.getByRole('button',{name:'Unpublish',exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('stale unpublish keeps the sermon and requires reload before retry',async({page})=>{
  const fixture=await sermons(page,'conflict');await page.goto('/#/admin/sermons');
  const list=page.getByRole('region',{name:'Sermon editorial list'}), row=list.locator('.editorial-sermon-item');
  page.once('dialog',d=>d.accept());await row.getByRole('button',{name:'Unpublish',exact:true}).click();
  await expect(list.getByRole('alert')).toContainText('Reload sermons');await expect(row).toContainText('Published');
  await expect(row.getByRole('button',{name:'Unpublish',exact:true})).toBeDisabled();expect(fixture.writes).toHaveLength(1);
  fixture.recover();await list.getByRole('button',{name:'Reload sermons',exact:true}).click();
  await expect(row.getByRole('button',{name:'Unpublish',exact:true})).toBeEnabled();
  page.once('dialog',d=>d.accept());await row.getByRole('button',{name:'Unpublish',exact:true}).click();
  await expect(row.locator('.editorial-sermon-status')).toHaveText('Draft');expect(fixture.writes[1]).toEqual({version:2,status:'draft'});
});

test('failed unpublish preserves the published record',async({page})=>{
  const fixture=await sermons(page,'unavailable');await page.goto('/#/admin/sermons');
  const list=page.getByRole('region',{name:'Sermon editorial list'}), row=list.locator('.editorial-sermon-item');
  page.once('dialog',d=>d.accept());await row.getByRole('button',{name:'Unpublish',exact:true}).click();
  await expect(list.getByRole('alert')).toContainText('Could not save');await expect(row.locator('.editorial-sermon-status')).toHaveText('Published');
  expect(fixture.writes).toHaveLength(1);
});

async function direct(page,age=0){
  await mocked(page,{signedIn:true});let deleted=false,fail=false;const calls=[];
  const message={id:MESSAGE,conversationId:CONVERSATION,senderId:ID,body:'My message to keep.',sequence:1,createdAt:new Date(Date.now()-age).toISOString()};
  await page.route('**/api/v1/conversations**',async route=>{
    const r=route.request(),path=new URL(r.url()).pathname;calls.push(r.method()+' '+path);
    if(r.method()==='DELETE'){
      if(fail)return route.fulfill({status:503,json:{error:{code:'unavailable',message:'Deletion temporarily unavailable.'}}});
      deleted=true;return route.fulfill({status:204});
    }
    if(path.endsWith('/read'))return route.fulfill({json:{data:{lastReadSequence:1}}});
    if(path.endsWith('/messages'))return route.fulfill({json:{data:[{...message,deleted}],meta:{nextBeforeSequence:0}}});
    return route.fulfill({json:{data:[{id:CONVERSATION,partnerId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',partnerFirstName:'Daniel',partnerLastName:'James',unreadCount:0}]}});
  });
  await page.goto('/#/chat');await page.getByRole('button',{name:'Open conversation with Daniel James'}).click();
  const anchor=page.locator('.message-actions-anchor').filter({hasText:'My message to keep.'});await expect(anchor).toBeVisible();
  return {anchor,calls,setFail(value){fail=value}};
}

test('expired direct messages have no Delete, Cut or Edit actions',async({page})=>{
  const fixture=await direct(page,11*60*1000);await fixture.anchor.dispatchEvent('contextmenu');
  const menu=page.getByRole('menu',{name:'Message actions'});await expect(menu).toBeVisible();
  for(const name of ['Delete','Cut','Edit message'])await expect(menu.getByRole('menuitem',{name,exact:true})).toHaveCount(0);
  await expect(menu.getByRole('menuitem',{name:'Copy',exact:true})).toBeVisible();expect(fixture.calls.some(c=>c.startsWith('DELETE'))).toBe(false);
});

test('an open menu loses destructive actions when the direct-message window expires',async({page})=>{
  await page.clock.install();const fixture=await direct(page,9*60*1000);await fixture.anchor.dispatchEvent('contextmenu');
  const menu=page.getByRole('menu',{name:'Message actions'});await expect(menu.getByRole('menuitem',{name:'Delete',exact:true})).toBeVisible();
  await page.clock.runFor(61*1000);
  for(const name of ['Delete','Cut','Edit message'])await expect(menu.getByRole('menuitem',{name,exact:true})).toHaveCount(0);
  expect(fixture.calls.some(c=>c.startsWith('DELETE'))).toBe(false);
});

test('failed direct-message deletion keeps the message and can be retried',async({page})=>{
  const fixture=await direct(page);fixture.setFail(true);await fixture.anchor.dispatchEvent('contextmenu');
  page.once('dialog',d=>d.accept());await page.getByRole('menuitem',{name:'Delete',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Deletion temporarily unavailable');await expect(fixture.anchor).toContainText('My message to keep.');
  fixture.setFail(false);await fixture.anchor.dispatchEvent('contextmenu');page.once('dialog',d=>d.accept());await page.getByRole('menuitem',{name:'Delete',exact:true}).click();
  await expect(page.getByText('This message was deleted.',{exact:true})).toBeVisible();
});

async function group(page,moderator){
  await mocked(page,{signedIn:true});const calls=[];
  await page.route('**/api/v1/group-conversations',route=>route.fulfill({json:{data:[{groupId:GROUP,groupName:'Youth fellowship',canModerate:moderator,unreadCount:0}]}}));
  await page.route('**/api/v1/groups/*/messages**',route=>{
    if(route.request().method()==='DELETE'){calls.push('DELETE');return route.fulfill({status:204})}
    return route.fulfill({json:{data:[{id:MESSAGE,groupId:GROUP,senderId:ID,firstName:'Grace',lastName:'Member',body:'Group message to keep.',sequence:1,createdAt:new Date().toISOString()}],meta:{nextBeforeSequence:0}}});
  });
  await page.route('**/api/v1/groups/*/read',route=>route.fulfill({json:{data:{lastReadSequence:1}}}));
  await page.goto('/#/chat');await page.getByRole('button',{name:'Group chats',exact:true}).click();await page.getByRole('button',{name:'Open group conversation Youth fellowship'}).click();
  const anchor=page.locator('.message-actions-anchor').filter({hasText:'Group message to keep.'});await expect(anchor).toBeVisible();return{anchor,calls};
}

test('ordinary group senders have Copy but no Delete or Cut',async({page})=>{
  const fixture=await group(page,false);await fixture.anchor.dispatchEvent('contextmenu');
  const menu=page.getByRole('menu',{name:'Message actions'});await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem',{name:'Delete',exact:true})).toHaveCount(0);await expect(menu.getByRole('menuitem',{name:'Cut',exact:true})).toHaveCount(0);
  await expect(menu.getByRole('menuitem',{name:'Copy',exact:true})).toBeVisible();expect(fixture.calls).toHaveLength(0);
});

test('group moderator confirms removal before a delete request is sent',async({page})=>{
  const fixture=await group(page,true);await fixture.anchor.dispatchEvent('contextmenu');
  page.once('dialog',d=>d.dismiss());await page.getByRole('menuitem',{name:'Delete',exact:true}).click();expect(fixture.calls).toHaveLength(0);
  await fixture.anchor.dispatchEvent('contextmenu');page.once('dialog',d=>d.accept());await page.getByRole('menuitem',{name:'Delete',exact:true}).click();
  await expect(page.getByText('This message was removed by a group moderator.',{exact:true})).toBeVisible();expect(fixture.calls).toHaveLength(1);
});
