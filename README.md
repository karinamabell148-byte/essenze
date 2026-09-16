# Casa Aurora — Cardápio Digital Web

Projeto reescrito em **apenas 4 arquivos** (HTML, CSS, JS de dados e JS de lógica), mantendo o mesmo visual e as mesmas funcionalidades da versão original em React, para facilitar a entrega e a correção.

## Arquivos

| Arquivo        | Conteúdo                                                                 |
|-----------------|---------------------------------------------------------------------------|
| `index.html`    | Estrutura da página (hero, seções institucionais, cardápio, carrinho)    |
| `style.css`     | Toda a aparência, cores, tipografia e responsividade                     |
| `products.js`   | Os 150 produtos (array de objetos JavaScript) — dados do cardápio         |
| `script.js`     | Toda a lógica: renderização dinâmica, busca, filtro, carrinho, cálculos e finalização do pedido |

## Como testar localmente

Como o navegador bloqueia alguns recursos ao abrir `index.html` diretamente (arquivo local), rode um servidor simples na pasta do projeto:

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000` no navegador.

## Publicação (obrigatória pelo enunciado)

Qualquer uma das opções abaixo funciona, pois o site é 100% estático (HTML/CSS/JS puro, sem backend):

- **GitHub Pages**: suba os 4 arquivos para um repositório e ative o GitHub Pages nas configurações (branch `main`, pasta raiz).
- **Netlify**: arraste a pasta do projeto em [app.netlify.com/drop](https://app.netlify.com/drop).
- **Vercel**: importe o repositório em [vercel.com/new](https://vercel.com/new) (framework: "Other").

## Checklist de requisitos do PDF

- [x] 5 categorias obrigatórias (Entradas, Prato Principal, Sobremesas, Bebidas, Carta de Vinhos)
- [x] 150 produtos no total, 30 por categoria
- [x] Cada produto com nome, descrição, preço, categoria e botão "Adicionar ao pedido"
- [x] Área "Meu Pedido" com nome, quantidade, valor unitário, valor total do item
- [x] Botões de aumentar/diminuir quantidade e remover produto
- [x] Cálculo automático de subtotal, 10% do garçom (opcional, com botão de ligar/desligar) e total
- [x] Coleta de nome do cliente e número da mesa antes de finalizar
- [x] Menu de categorias, campo de pesquisa por nome e filtro por categoria
- [x] Botão "FINALIZAR PEDIDO" com resumo completo (cliente, mesa, produtos, quantidades, subtotal, garçom, total)
- [x] HTML + CSS + JavaScript puro, produtos armazenados em array/objetos no JS, cardápio gerado dinamicamente
- [x] Layout responsivo (computador, tablet, smartphone)

## Observação sobre as imagens

As fotos dos pratos usam URLs públicas do Unsplash (mesmas do projeto original), então é necessária conexão com a internet para exibi-las.
