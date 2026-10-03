# Solicitações de privacidade

## Fluxo

1. Um administrador registra tipo, descrição e contato mínimo quando necessário.
2. O pedido recebe status, responsável e observações internas.
3. A avaliação relacionada pode ser vinculada sem guardar documento pessoal.
4. A operação de minimização remove o contato separado e, quando confirmado, redige comentário e motivo de insatisfação.
5. Nota, respostas estruturadas e contribuição aos indicadores permanecem.
6. Criação, alteração e minimização produzem auditoria sem copiar dados pessoais completos.

## Acesso

`CARTORIO_ADMIN` e `PLATFORM_ADMIN` dentro do tenant atual podem consultar e tratar pedidos. `GESTOR` e `OPERADOR` não têm acesso. O frontend repete a regra de apresentação; servidor e RLS são as barreiras de autorização.

## Estados

`recebida`, `em_analise`, `aguardando_validacao`, `concluida`, `indeferida` e `cancelada`. Um pedido encerrado não volta a ser alterado. Registros não podem ser excluídos por usuários da aplicação.

O procedimento jurídico para validação de identidade, resposta, recurso e prazos permanece pendente de definição pelo controlador.