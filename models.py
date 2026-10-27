import torch
import torch.nn as nn
import torch.nn.functional as F

class SelfAttention(nn.Module):
    def __init__(self, hidden_dim):
        super(SelfAttention, self).__init__()
        self.attn = nn.Linear(hidden_dim, 1)

    def forward(self, x):
        # x shape: (batch_size, seq_len, hidden_dim)
        scores = self.attn(x)
        weights = F.softmax(scores, dim=1)
        context = torch.sum(weights * x, dim=1)
        return context, weights

class CosineClassifier(nn.Module):
    """Cosine Classifier with temperature scaling to prevent Non-IID logit divergence"""
    def __init__(self, in_features, num_classes, scale=16.0):
        super(CosineClassifier, self).__init__()
        self.in_features = in_features
        self.num_classes = num_classes
        self.scale = scale
        self.weight = nn.Parameter(torch.Tensor(num_classes, in_features))
        nn.init.xavier_uniform_(self.weight)

    def forward(self, x):
        # Normalize features and weights along embedding dimension
        x_norm = F.normalize(x, p=2, dim=1)
        w_norm = F.normalize(self.weight, p=2, dim=1)
        logits = F.linear(x_norm, w_norm) * self.scale
        return logits

# ==========================================
# 1. Memory Model (Windows & Kali)
# ==========================================
class MemoryAttentionModel(nn.Module):
    """Memory Model: Transformer Encoder -> BiLSTM -> Self-Attention -> Classifier Head"""
    def __init__(self, input_dim=55, embed_dim=64, num_heads=4, hidden_lstm=64, num_classes=2):
        super(MemoryAttentionModel, self).__init__()
        self.input_proj = nn.Linear(input_dim, embed_dim)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim, nhead=num_heads, dim_feedforward=128, batch_first=True, dropout=0.2
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=2)
        self.bilstm = nn.LSTM(embed_dim, hidden_lstm, num_layers=1, bidirectional=True, batch_first=True)
        self.attention = SelfAttention(hidden_lstm * 2)
        self.classifier = nn.Sequential(
            nn.Linear(hidden_lstm * 2, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, num_classes)
        )

    def forward(self, x, return_embedding=False):
        x_proj = self.input_proj(x).unsqueeze(1)
        trans_out = self.transformer(x_proj)
        lstm_out, _ = self.bilstm(trans_out)
        embedding, _ = self.attention(lstm_out)
        if return_embedding:
            return embedding
        return self.classifier(embedding)

# ==========================================
# 2. Network Model (Ubuntu 1 & Ubuntu 2)
# ==========================================
class NetworkAttentionModel(nn.Module):
    """
    Federated-Safe Transformer-BiLSTM with LayerNorm (Zero Client-Drift Normalization)
    """
    def __init__(self, input_dim=70, embed_dim=128, num_heads=4, hidden_lstm=64, num_classes=15):
        super(NetworkAttentionModel, self).__init__()
        
        # 1. Non-IID Safe Feature Stem (LayerNorm instead of BatchNorm)
        self.dense_stem = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(256, 256),
            nn.LayerNorm(256),
            nn.GELU()
        )
        
        self.seq_proj = nn.Linear(32, embed_dim)
        
        # 2. Multi-Head Attention Encoder
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim, 
            nhead=num_heads, 
            dim_feedforward=256, 
            batch_first=True, 
            dropout=0.1, 
            activation="gelu"
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=2)
        
        # 3. BiLSTM Sequence Modeling
        self.bilstm = nn.LSTM(embed_dim, hidden_lstm, num_layers=1, bidirectional=True, batch_first=True)
        
        # 4. Context Attention Pooling
        self.attention = SelfAttention(hidden_lstm * 2)
        
        # 5. Classifier Head
        self.classifier = nn.Sequential(
            nn.Linear(hidden_lstm * 2, 128),
            nn.LayerNorm(128),
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.GELU(),
            nn.Linear(64, num_classes)
        )

    def forward(self, x, return_embedding=False):
        batch_size = x.size(0)
        x_dense = self.dense_stem(x)
        
        # Reshape to tokenized sequence
        x_seq = x_dense.view(batch_size, 8, 32)
        x_proj = self.seq_proj(x_seq)
        
        trans_out = self.transformer(x_proj)
        lstm_out, _ = self.bilstm(trans_out)
        embedding, _ = self.attention(lstm_out)
        
        if return_embedding:
            return embedding
            
        return self.classifier(embedding)

# ==========================================
# 3. Zero-Day Autoencoder
# ==========================================
class ZeroDayAutoencoder(nn.Module):
    """Autoencoder for Unknown / Zero-Day Attack Anomaly Detection"""
    def __init__(self, input_dim=70):
        super(ZeroDayAutoencoder, self).__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 48),
            nn.LayerNorm(48),
            nn.LeakyReLU(0.2),
            nn.Linear(48, 16),
            nn.LeakyReLU(0.2)
        )
        self.decoder = nn.Sequential(
            nn.Linear(16, 48),
            nn.LayerNorm(48),
            nn.LeakyReLU(0.2),
            nn.Linear(48, input_dim)
        )

    def forward(self, x):
        latent = self.encoder(x)
        return self.decoder(latent)

    def compute_anomaly_score(self, x):
        with torch.no_grad():
            reconstructed = self.forward(x)
            mse_loss = torch.mean((x - reconstructed) ** 2, dim=1)
        return mse_loss

# ==========================================
# 4. Cross-Attention Multi-Modal Fusion Model
# ==========================================
class HybridFusionModel(nn.Module):
    """Cross-Attention Fusion Layer combining Memory and Network Latent Embeddings"""
    def __init__(self, mem_embed_dim=128, net_embed_dim=128, fusion_dim=128, total_classes=17):
        super(HybridFusionModel, self).__init__()
        self.cross_attn = nn.MultiheadAttention(embed_dim=fusion_dim, num_heads=4, batch_first=True)
        self.fusion_fc = nn.Sequential(
            nn.Linear(fusion_dim * 2, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, total_classes)
        )

    def forward(self, mem_embed, net_embed):
        m = mem_embed.unsqueeze(1)
        n = net_embed.unsqueeze(1)
        attn_out, _ = self.cross_attn(m, n, n)
        fused = torch.cat([m.squeeze(1), attn_out.squeeze(1)], dim=-1)
        return self.fusion_fc(fused)