-- PASSO 1 (só leitura): rode no phpMyAdmin do banco de produção e me envie o resultado.
-- Separa as visitas de teste (copiadas do computador local ou feitas por robôs) das reais.

SELECT
  CASE
    WHEN COALESCE(referrer,'') LIKE '%localhost%' OR COALESCE(referrer,'') LIKE '%192.168.%' OR created_at < '2026-10-05' THEN 'teste: computador local ou antes do lançamento'
    WHEN user_agent LIKE '%HeadlessChrome%' OR user_agent LIKE '%Claude/%' OR user_agent LIKE '%SIMULACAO%' OR user_agent LIKE '%VERIFICACAO%' THEN 'teste: navegador automático'
    WHEN path LIKE '/\\_evento/%' THEN 'evento (WhatsApp/busca)'
    ELSE 'possível visita real'
  END AS tipo,
  COUNT(*) AS total,
  MIN(created_at) AS primeira,
  MAX(created_at) AS ultima
FROM site_visits
GROUP BY tipo
ORDER BY total DESC;

-- Visitas reais por dia
SELECT DATE(created_at) AS dia, COUNT(*) AS paginas, COUNT(DISTINCT user_agent) AS aparelhos_distintos
FROM site_visits
WHERE NOT (COALESCE(referrer,'') LIKE '%localhost%' OR COALESCE(referrer,'') LIKE '%192.168.%' OR created_at < '2026-10-05')
  AND COALESCE(user_agent,'') NOT LIKE '%HeadlessChrome%' AND COALESCE(user_agent,'') NOT LIKE '%Claude/%'
  AND path NOT LIKE '/\\_evento/%'
GROUP BY dia ORDER BY dia;

-- De onde vieram (site anterior / Google / Instagram...)
SELECT COALESCE(NULLIF(SUBSTRING_INDEX(SUBSTRING_INDEX(referrer, '/', 3), '//', -1), ''), '(direto)') AS origem, COUNT(*) AS total
FROM site_visits
WHERE NOT (COALESCE(referrer,'') LIKE '%localhost%' OR COALESCE(referrer,'') LIKE '%192.168.%' OR created_at < '2026-10-05')
  AND COALESCE(user_agent,'') NOT LIKE '%HeadlessChrome%' AND COALESCE(user_agent,'') NOT LIKE '%Claude/%'
  AND path NOT LIKE '/\\_evento/%'
GROUP BY origem ORDER BY total DESC LIMIT 20;
