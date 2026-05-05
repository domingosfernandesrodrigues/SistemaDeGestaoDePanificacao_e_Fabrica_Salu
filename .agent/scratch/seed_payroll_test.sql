-- SCRIPT DE SEED PARA TESTE DE FOLHA CLT + AGENDA
-- SGP-F ERP

DECLARE @FuncId UNIQUEIDENTIFIER;
-- Busca o primeiro funcionário ativo para o teste
SELECT TOP 1 @FuncId = Id FROM Funcionarios WHERE Ativo = 1;

IF @FuncId IS NOT NULL
BEGIN
    -- 1. Inserir Feriado na Agenda (10/05/2026)
    IF NOT EXISTS (SELECT 1 FROM AgendaEventos WHERE CAST(Data AS DATE) = '2026-05-10')
    BEGIN
        INSERT INTO AgendaEventos (Id, Titulo, Data, Tipo, Descricao)
        VALUES (NEWID(), 'Feriado de Teste SGPF', '2026-05-10 00:00:00', 'Feriado', 'Dia para testar HE 100%');
        PRINT 'Feriado inserido com sucesso!';
    END

    -- 2. Inserir Ponto no Feriado (10/05/2026 - 08:00 às 17:00)
    -- Deve gerar HE 100% sobre as 9 horas (ou conforme configurado)
    IF NOT EXISTS (SELECT 1 FROM RegistrosPonto WHERE FuncionarioId = @FuncId AND CAST(DataHoraEntrada AS DATE) = '2026-05-10')
    BEGIN
        INSERT INTO RegistrosPonto (Id, FuncionarioId, DataHoraEntrada, DataHoraSaida, TotalHorasTrabalhadas, TotalHorasExtras, Observacao)
        VALUES (NEWID(), @FuncId, '2026-05-10 08:00:00', '2026-05-10 17:00:00', 9.0, 1.0, 'Teste Feriado 100%');
        PRINT 'Ponto de feriado inserido!';
    END

    -- 3. Inserir Ponto Noturno (11/05/2026 - 20:00 às 23:00)
    -- Deve gerar 1 hora de Adicional Noturno (das 22h às 23h)
    IF NOT EXISTS (SELECT 1 FROM RegistrosPonto WHERE FuncionarioId = @FuncId AND CAST(DataHoraEntrada AS DATE) = '2026-05-11')
    BEGIN
        INSERT INTO RegistrosPonto (Id, FuncionarioId, DataHoraEntrada, DataHoraSaida, TotalHorasTrabalhadas, TotalHorasExtras, Observacao)
        VALUES (NEWID(), @FuncId, '2026-05-11 20:00:00', '2026-05-11 23:00:00', 3.0, 0.0, 'Teste Adicional Noturno');
        PRINT 'Ponto noturno inserido!';
    END
END
ELSE
BEGIN
    PRINT 'AVISO: Nenhum funcionário ativo encontrado para o teste. Cadastre um funcionário primeiro.';
END
