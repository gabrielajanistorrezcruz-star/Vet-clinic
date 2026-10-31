require('dotenv').config();
const express=require('express');
const path=require('path');
const app=express();
app.use(express.json({limit:'1mb'}));
app.use(express.static(__dirname));
app.post('/api/chat',async(req,res)=>{
  const key=process.env.OPENROUTER_API_KEY;
  if(!key)return res.status(503).json({error:'Falta configurar OPENROUTER_API_KEY en el archivo .env.'});
  const messages=Array.isArray(req.body.messages)?req.body.messages:[];
  if(!messages.length)return res.status(400).json({error:'Envía un mensaje para iniciar la conversación.'});
  const safeMessages=[{role:'system',content:'Eres un asistente informativo de Vet Clinic. Ofrece orientación general sobre bienestar animal, explica que no reemplazas a un veterinario y no afirmes diagnósticos. Ante síntomas graves o urgentes, recomienda acudir inmediatamente a una clínica veterinaria. No indiques dosis de medicamentos ni tratamientos riesgosos.'},...messages.filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-20)];
  try{
    const upstream=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','HTTP-Referer':process.env.SITE_URL||'http://localhost:3000','X-Title':'Vet Clinic'},body:JSON.stringify({model:process.env.OPENROUTER_MODEL||'openai/gpt-4o-mini',messages:safeMessages,stream:true})});
    if(!upstream.ok){const detail=await upstream.text();return res.status(upstream.status).json({error:`OpenRouter respondió con estado ${upstream.status}: ${detail.slice(0,300)}`});}
    res.setHeader('Content-Type','text/plain; charset=utf-8');res.setHeader('Transfer-Encoding','chunked');res.setHeader('Cache-Control','no-cache');
    const reader=upstream.body.getReader();const decoder=new TextDecoder();let buffer='';
    while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split('\n');buffer=lines.pop()||'';for(const line of lines){if(!line.startsWith('data:'))continue;const data=line.slice(5).trim();if(data==='[DONE]')continue;try{const parsed=JSON.parse(data);const token=parsed.choices?.[0]?.delta?.content;if(token)res.write(token);}catch{}}}
    res.end();
  }catch(error){if(!res.headersSent)res.status(500).json({error:'No se pudo conectar con OpenRouter.'});else res.end();}
});
const port=process.env.PORT||3000;app.listen(port,()=>console.log(`Vet Clinic disponible en http://localhost:${port}`));
