-- PASSO 2 (apaga): remove do banco de produção as visitas de teste, para o painel Visitantes
-- mostrar só clientes reais. Rode depois de conferir o PASSO 1 (visitas_diagnostico.sql).
-- Recomendado: exporte a tabela site_visits no phpMyAdmin antes (aba Exportar), como backup.

DELETE FROM site_visits
WHERE COALESCE(referrer,'') LIKE '%localhost%'
   OR COALESCE(referrer,'') LIKE '%192.168.%'
   OR created_at < '2026-10-05'  -- o site entrou no ar em 05/10: antes disso só havia testes
   OR user_agent LIKE '%HeadlessChrome%'
   OR user_agent LIKE '%Claude/%'
   OR user_agent LIKE '%SIMULACAO%'
   OR user_agent LIKE '%VERIFICACAO%';
