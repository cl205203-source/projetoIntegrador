// Teste da sanitização (não acessa o banco): npm test
const assert = require('assert');
const san = require('./src/main/sanitize');

assert.strictEqual(san.texto('<script>alert(1)</script>  Ana\u0000  Silva'), 'alert(1) Ana Silva');
assert.strictEqual(san.cpf('11122233344'), '111.222.333-44');
assert.strictEqual(san.cpf('111.222.333-44'), '111.222.333-44');
assert.throws(() => san.cpf('123'), /CPF inválido/);
assert.throws(() => san.email('sem-arroba'), /E-mail inválido/);
assert.strictEqual(san.campo('email', ' ANA@X.com '), 'ana@x.com');
assert.strictEqual(san.campo('nome', '   '), null);
assert.strictEqual(san.campo('telefone', '(19) 99999-0000 abc'), '(19) 99999-0000');
assert.strictEqual(san.inteiro('3'), 3);
assert.strictEqual(san.inteiro('a'), null);
console.log('OK - sanitização passou em todos os testes.');
