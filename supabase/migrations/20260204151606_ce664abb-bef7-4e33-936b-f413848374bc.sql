-- Adicionar campo campaign_type na tabela campaigns
ALTER TABLE campaigns 
ADD COLUMN campaign_type text NOT NULL DEFAULT 'despacho';

-- Criar índice para melhorar performance de queries filtradas por tipo
CREATE INDEX idx_campaigns_campaign_type ON campaigns(campaign_type);

-- Comentário explicativo
COMMENT ON COLUMN campaigns.campaign_type IS 'Tipo de campanha: despacho, pirata, ura, ligacao. Grupos usam tabela separada group_campaigns.';