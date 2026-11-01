import { test, expect } from '@playwright/test';
import { samplePdf } from '../../scripts/sample-pdf.mjs';

const projectId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userId='11111111-1111-4111-8111-111111111111';
async function signIn(page: import('@playwright/test').Page) {
  await page.addInitScript(({ userId })=>{
    if(sessionStorage.getItem('test-signed-out'))return;
    const access_token=[btoa(JSON.stringify({alg:'HS256',typ:'JWT'})),btoa(JSON.stringify({sub:userId,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated',aud:'authenticated'})),'local-test-signature'].join('.');
    localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:{id:userId,email:'contract@example.test',aud:'authenticated',user_metadata:{full_name:'Contract tester'}}}));
  },{userId});
}
for(const width of [1440,768,390]){
  test(`public routes and anonymous guards at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:950});
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    for(const route of ['/','/login','/tutorial']){
      const response=await page.goto(route);expect(response?.status()).toBe(200);
      await expect(page.locator('body')).not.toBeEmpty();
      await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    }
    await page.goto(`/workspace/${projectId}`);await expect(page).toHaveURL(/\/login$/);
    await page.screenshot({path:`test-results/public-${width}.png`,fullPage:true});
    expect(errors).toEqual([]);
  });
}
test('same-origin backend proxy returns actual backend JSON and rejects anonymous writes',async({request})=>{
  const health=await request.get('/api/health');expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({status:'ok',service:'tuydui-backend'});
  const write=await request.post('/api/ai',{data:{task:'extract_requirements',projectId,text:'Client brief'}});expect(write.status()).toBe(401);
});
test('create, PDF, AI/map, baseline, change review, save/reload, quota and logout (mock services)',async({page,request})=>{
  await request.post('http://127.0.0.1:4401/__test/reset',{data:{empty:true}});
  await signIn(page);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto('/auth/callback');
  await expect(page).toHaveURL(/\/projects$/);
  await page.locator('.projects-header .button-primary').click();
  await page.locator('#project-name').fill('Contract test project');
  await page.locator('#client-name').fill('Test client');
  await page.locator('form button[type=submit]').click();
  await expect(page).toHaveURL(new RegExp(`/workspace/${projectId}$`));
  await expect(page.getByRole('heading',{name:'Contract test project'}).first()).toBeVisible();
  await page.getByRole('button',{name:/Requirements/}).first().click();
  await page.locator('input[type=file]').first().setInputFiles({name:'brief.pdf',mimeType:'application/pdf',buffer:Buffer.from(samplePdf())});
  await page.getByRole('button',{name:'Read PDF',exact:true}).click();
  await expect(page.locator('.map-node').filter({hasText:'Login'})).toBeVisible();
  const noteSaved=page.waitForResponse(response=>response.url().endsWith('/api/workspace')&&response.request().method()==='PUT'&&response.request().postDataJSON()?.snapshot?.nodeNotes?.root==='Persistence contract check');
  await page.getByPlaceholder('Add a note for your team...').fill('Persistence contract check');
  await page.getByRole('button',{name:'Save node details',exact:true}).click();
  expect((await noteSaved).status()).toBe(200);
  await expect(page.getByRole('status')).toContainText('Saved to server');
  await page.reload();
  await expect(page.getByPlaceholder('Add a note for your team...')).toHaveValue('Persistence contract check');
  await page.getByRole('button',{name:'Confirm baseline',exact:true}).click();
  await expect(page.locator('.sidebar-baseline')).toContainText('Confirmed');
  await page.reload();await expect(page.locator('.sidebar-baseline')).toContainText('Confirmed');
  await page.getByRole('button',{name:/Changes/}).first().click();
  await page.locator('#client-message').fill('The client still requires the login page.');
  await page.getByRole('button',{name:'Review',exact:true}).click();
  await expect(page.locator('.review-result')).toContainText('Already requested');
  for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:950});
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await page.screenshot({path:`test-results/workspace-${width}.png`,fullPage:true});
  }
  await page.setViewportSize({width:1440,height:950});
  await page.goto('/projects');await page.locator('.projects-header .button-primary').click();
  await expect(page.locator('.quota-modal-content')).toBeVisible();
  await page.locator('.quota-modal-close').click();
  for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:950});
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await page.screenshot({path:`test-results/projects-${width}.png`,fullPage:true});
  }
  await page.setViewportSize({width:1440,height:950});
  await page.evaluate(()=>sessionStorage.setItem('test-signed-out','1'));
  await page.locator('.signout-btn').click();await expect(page).toHaveURL(/\/login$/);
  await page.goto(`/workspace/${projectId}`);await expect(page).toHaveURL(/\/login$/);
  expect(errors).toEqual([]);
});
