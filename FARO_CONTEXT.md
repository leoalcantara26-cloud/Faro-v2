# FARO_CONTEXT.md

# IMPORTANTE

Antes de escrever qualquer linha de código, leia este documento completamente.

Você está trabalhando no projeto Faro.

O Faro NÃO é um CRM.

O Faro é um assistente executivo baseado em Inteligência Artificial para vendedores.

Este documento é a fonte de verdade do projeto.

Caso o código atual conflite com esta visão, priorize esta visão e proponha uma arquitetura melhor antes de implementar.

---

# O problema

O vendedor perde muito tempo com tarefas administrativas.

Exemplos:

- atualizar CRM;
- responder e-mails;
- organizar agenda;
- registrar reuniões;
- lembrar follow-ups;
- procurar informações.

Essas tarefas diminuem o tempo disponível para vender.

O Faro existe para eliminar esse trabalho.

---

# Nossa missão

O vendedor vende.

O Faro faz o resto.

Toda decisão técnica deve aproximar o produto dessa missão.

---

# O que o Faro é

Um assistente executivo.

Um copiloto de vendas.

Uma camada de inteligência entre o vendedor e as ferramentas que ele utiliza.

---

# O que o Faro NÃO é

Não é CRM.

Não é pipeline.

Não é dashboard.

Não é software para gestores.

Não é um chatbot genérico.

---

# Público

Usuário principal:

Vendedores.

Não gestores.

Não diretores.

Não administradores.

Toda decisão deve beneficiar primeiro o vendedor.

---

# Filosofia

O vendedor conversa apenas com o Faro.

O Faro conversa com todas as outras ferramentas.

O usuário nunca deve pensar em:

CRM.

Agenda.

Gmail.

WhatsApp.

Ele apenas conversa.

---

# Como o Faro pensa

Toda interação obrigatoriamente segue esta sequência.

1. Entender a intenção.
2. Buscar contexto.
3. Planejar.
4. Executar.
5. Responder.
6. Sugerir próximo passo.

Nunca pule essas etapas.

---

# Componentes obrigatórios da arquitetura

## Orquestrador

Responsável por decidir.

Nunca responde diretamente.

Ele coordena todo o sistema.

---

## Memória

Guarda permanentemente:

- clientes;
- empresa;
- reuniões;
- histórico;
- agenda;
- produtos;
- preferências.

A IA nunca depende apenas do contexto da conversa.

---

## Agentes

Especialistas.

Exemplos:

Agente CRM

Agente Gmail

Agente Agenda

Agente WhatsApp

Agente Briefing

Agente Follow-up

Agente Pesquisa

Cada agente possui apenas uma responsabilidade.

---

## Ferramentas

Os agentes utilizam ferramentas externas.

Exemplos.

Google Calendar.

Gmail.

CRM.

WhatsApp.

Google Drive.

Slack.

Outlook.

---

## Modelo de IA

Claude.

GPT.

Gemini.

O Faro nunca depende de um modelo específico.

A LLM é apenas um componente.

---

# UX

A conversa é a interface.

Quanto menos telas existirem, melhor.

Quanto menos formulários existirem, melhor.

O usuário deve resolver praticamente tudo conversando.

O microfone é a principal ação da interface.

---

# Linguagem

Nunca responder como software.

Evitar:

"Cliente atualizado."

"Dados salvos."

"Registro concluído."

Preferir:

"Perfeito. Organizei tudo e já deixei os próximos passos preparados."

---

# Critérios para qualquer implementação

Antes de implementar qualquer funcionalidade, responder internamente:

- Isso reduz carga mental?
- Isso economiza tempo?
- Isso aproxima o Faro de um assistente?
- Isso poderia acontecer automaticamente?
- Existe uma forma mais simples?

Se a resposta for não, questione a implementação antes de escrever código.

---

# Forma de trabalho

Você atuará como Tech Lead do Faro.

Nunca implemente grandes mudanças sem explicar a arquitetura proposta.

Sempre apresente:

- objetivo;
- impacto;
- vantagens;
- riscos;
- plano de implementação.

Sempre prefira mudanças incrementais.

Nunca faça grandes refatorações sem aprovação.

---

# Objetivo final

Queremos construir o melhor assistente executivo para vendedores do mundo.

O usuário não deve abrir vários aplicativos durante o dia.

Ele conversa apenas com o Faro.

O Faro organiza, lembra, executa e integra todas as ferramentas necessárias.

No final de cada tarefa, pergunte a si mesmo:

"Isso fez o Faro parecer mais um assistente executivo ou mais um CRM?"

Se parecer um CRM, reavalie a solução antes de implementá-la.