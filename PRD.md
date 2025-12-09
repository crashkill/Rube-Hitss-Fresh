# Product Requirements Document (PRD) - Open Rube

## 1. Visão Geral e Problema
**Problema:** Assistentes de IA tradicionais são passivos, sugerindo ações mas incapazes de executá-las em ferramentas externas.
**Solução:** Open Rube, uma implementação open-source do Rube, permitindo que agentes de IA executem ações diretamente em 500+ aplicações via Composio.
**Contexto:** Projeto React/Next.js existente, focado em replicar a funcionalidade da versão comercial do Rube (rube.app).

## 2. Público-Alvo
- Desenvolvedores que desejam integrar automação de IA em seus fluxos de trabalho.
- Usuários que buscam uma alternativa self-hosted e customizável ao Rube comercial.

## 3. Funcionalidades Principais
- **Interface de Chat com IA:** Interação natural via GPT-4/5.
- **Router de Ferramentas (Tool Router):** Descoberta e execução automática de ferramentas via Composio.
- **Gestão de Conexões:** Interface para conectar/desconectar contas (Google, GitHub, Slack, etc.).
- **Histórico de Conversas:** Persistência de sessões de chat.
- **Autenticação:** Sistema de login via Supabase.

## 4. Fluxo de Usuário
1. Usuário faz login na aplicação.
2. Usuário conecta suas ferramentas (ex: Gmail, GitHub) na aba "Apps".
3. Usuário inicia um chat e solicita uma tarefa.
4. O Agente identifica a ferramenta, autentica (se necessário) e executa a ação.
5. O resultado é retornado no chat em tempo real.

## 5. Critérios de Sucesso
- Aplicação carrega sem erros no browser.
- Conexões com apps (Gmail, etc.) funcionam e persistem (Status: ACTIVE).
- Agente consegue executar ações simples nas ferramentas conectadas.

## 6. Riscos + Mitigação
- **Risco:** Falha na autenticação via Composio/Supabase. **Mitigação:** Revisão rigorosa dos fluxos de auth e logs.
- **Risco:** Latência alta na resposta do LLM. **Mitigação:** Feedback visual de loading/streaming.

## 7. Arquitetura de Componentes
- **Frontend:** Next.js 15, React 19, Tailwind CSS.
- **Backend:** Next.js API Routes.
- **DB/Auth:** Supabase.
- **Integração:** Composio SDK (MCP).

## 8. Stack Sugerida
- [x] Next.js
- [x] Tailwind
- [x] Supabase
- [x] Composio

## 9. Roadmap
- [ ] Fase 1: Análise e correção de bugs atuais (Browser/Conexão).
- [ ] Fase 2: Estabilização do ToolRouter.
- [ ] Fase 3: Paridade visual completa com rube.app.
