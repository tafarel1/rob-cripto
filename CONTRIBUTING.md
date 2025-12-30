# Guia de Contribuição - Robô Cripto

Obrigado por considerar contribuir para o Robô Cripto! Este documento descreve o processo de contribuição para este projeto.

## Código de Conduta

Ao participar deste projeto, espera-se que todos os colaboradores mantenham um ambiente respeitoso e inclusivo.

## Como Posso Contribuir?

### Reportando Bugs

Se você encontrar um bug, por favor crie uma issue detalhada seguindo nosso template de "Bug Report". Inclua:
- Passos para reproduzir
- Comportamento esperado vs real
- Logs ou screenshots relevantes

### Sugerindo Melhorias

Sugestões de novas features são bem-vindas! Use o template "Feature Request" para descrever sua ideia e como ela beneficiaria o projeto.

### Pull Requests

1. **Fork** o repositório.
2. Crie uma **branch** para sua feature (`git checkout -b feature/minha-feature`).
3. Faça seus **commits** (`git commit -m 'feat: Adiciona nova funcionalidade'`).
4. Envie para o **remote** (`git push origin feature/minha-feature`).
5. Abra um **Pull Request**.

### Padrões de Código

- **TypeScript**: Utilize tipagem estrita sempre que possível.
- **Commits**: Siga o padrão [Conventional Commits](https://www.conventionalcommits.org/).
  - `feat:` Nova funcionalidade
  - `fix:` Correção de bug
  - `docs:` Documentação
  - `style:` Formatação (sem alteração de código)
  - `refactor:` Refatoração de código
  - `test:` Adição ou correção de testes
- **Linter**: Certifique-se de que seu código passa no ESLint configurado.

## Desenvolvimento Local

1. Instale as dependências: `npm install`
2. Configure as variáveis de ambiente (`.env`)
3. Inicie em modo desenvolvimento: `npm run dev`

## Testes

Antes de submeter um PR, execute os testes para garantir que nada quebrou:
```bash
npm test
```
