import {test,expect} from '@playwright/test';
import {pastoralMock} from './fixtures/pastoral.mjs';
test('unlisted pastors can review requests but cannot publish new availability',async({page})=>{
 await pastoralMock(page,{pastor:true,listed:false});await page.goto('/#/pastors');
 await expect(page.getByRole('region',{name:'Assigned appointments'})).toBeVisible();
 const availability=page.getByRole('region',{name:'Manage my availability'});
 await expect(availability.getByRole('button',{name:'Publish slot'})).toBeDisabled();
 await expect(availability).toContainText('not listed');
});
