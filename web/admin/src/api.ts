import axios from 'axios';

const api = axios.create({
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to inject the token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        const tenantID = localStorage.getItem('tenantID');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (tenantID) {
            config.headers['X-Tenant-ID'] = tenantID;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export const login = async (username: string, password: string, deviceID?: string, osVersion?: string) => {
    const headers: Record<string, string> = {};
    if (deviceID) {
        headers['X-Device-ID'] = deviceID;
    }
    if (osVersion) {
        headers['X-OS-Version'] = osVersion;
    }
    const response = await api.post('/login', { username, password }, { headers });
    return response.data;
};

export const signup = async (email: string, password: string, companyName: string) => {
    const response = await api.post('/api/v1/signup', { email, password, company_name: companyName });
    return response.data;
};

export const lookupUser = async (email: string) => {
    const response = await api.post('/login/lookup', { email });
    return response.data;
};

export const completeMfaLogin = async (pendingToken: string, totpCode: string, userId: string) => {
    const response = await api.post('/login/mfa', {
        pending_token: pendingToken,
        totp_code: totpCode,
        user_id: userId
    });
    return response.data;
};

// WebAuthn
export const beginRegistration = async (userID: string) => {
    // Requires X-User-ID header if not authenticated? Or authenticated context.
    // Our backend expects X-User-ID header for now as per previous implementation logic.
    // But usually registration is done while logged in.
    const response = await api.post('/api/v1/mfa/webauthn/register/begin', {}, {
        headers: { 'X-User-ID': userID }
    });
    return response.data;
};

export const finishRegistration = async (userID: string, data: any) => {
    const response = await api.post('/api/v1/mfa/webauthn/register/finish', data, {
        headers: { 'X-User-ID': userID }
    });
    return response.data;
};

export const beginLogin = async (userID: string) => {
    const response = await api.post('/api/v1/mfa/webauthn/login/begin', { user_id: userID });
    return response.data;
};

export const finishLogin = async (userID: string, data: any) => {
    const response = await api.post(`/api/v1/mfa/webauthn/login/finish?user_id=${userID}`, data);
    return response.data;
};

export const getSCIMUsers = async () => {
    const response = await api.get('/scim/v2/Users');
    return response.data;
};

export const createAccessRequest = async (resourceType: string, resourceID: string, reason: string) => {
    const response = await api.post('/api/v1/governance/requests', {
        resource_type: resourceType,
        resource_id: resourceID,
        reason: reason
    });
    return response.data;
};

export const getAccessRequests = async (status?: string) => {
    const params = status ? { status } : {};
    const response = await api.get('/api/v1/governance/requests', { params });
    return response.data;
};

export const approveAccessRequest = async (id: string, comment: string) => {
    const response = await api.post(`/api/v1/governance/requests/${id}/approve`, { comment });
    return response.data;
};

export const rejectAccessRequest = async (id: string, comment: string) => {
    const response = await api.post(`/api/v1/governance/requests/${id}/reject`, { comment });
    return response.data;
};

// RBAC - Roles
export const getRoles = async () => {
    const response = await api.get('/api/v1/roles');
    return response.data;
};

export const createRole = async (name: string, description: string) => {
    const response = await api.post('/api/v1/roles', { name, description });
    return response.data;
};

export const deleteRole = async (id: string) => {
    const response = await api.delete(`/api/v1/roles/${id}`);
    return response.data;
};

export const getRolePermissions = async (roleId: string) => {
    const response = await api.get(`/api/v1/roles/${roleId}/permissions`);
    return response.data;
};

export const assignPermissionToRole = async (roleId: string, permissionId: string) => {
    const response = await api.post(`/api/v1/roles/${roleId}/permissions/${permissionId}`);
    return response.data;
};

// RBAC - Permissions
export const getPermissions = async () => {
    const response = await api.get('/api/v1/permissions');
    return response.data;
};

export const createPermission = async (resource: string, action: string, description: string) => {
    const response = await api.post('/api/v1/permissions', { resource, action, description });
    return response.data;
};

// RBAC - User Roles
export const getUserRoles = async (userId: string) => {
    const response = await api.get(`/api/v1/users/${userId}/roles`);
    return response.data;
};

export const assignRoleToUser = async (userId: string, roleId: string) => {
    const response = await api.post(`/api/v1/users/${userId}/roles/${roleId}`);
    return response.data;
};

export const removeRoleFromUser = async (userId: string, roleId: string) => {
    const response = await api.delete(`/api/v1/users/${userId}/roles/${roleId}`);
    return response.data;
};

// Audit Logs
export const getAuditLogs = async (params?: {
    action?: string;
    resource_type?: string;
    start_time?: string;
    end_time?: string;
    limit?: number;
    offset?: number;
}) => {
    const response = await api.get('/api/v1/audit', { params });
    return response.data;
};

export const exportAuditLogs = async (params?: Record<string, unknown>) => {
    const response = await api.get('/api/v1/audit/export', {
        params,
        responseType: 'blob'
    });
    return response.data;
};

// Campaigns
export const getCampaigns = async (status?: string) => {
    const params = status ? { status } : {};
    const response = await api.get('/api/v1/campaigns', { params });
    return response.data;
};

export const createCampaign = async (name: string, description: string, reviewerId: string) => {
    const response = await api.post('/api/v1/campaigns', {
        name,
        description,
        reviewer_id: reviewerId
    });
    return response.data;
};

export const startCampaign = async (id: string) => {
    const response = await api.post(`/api/v1/campaigns/${id}/start`);
    return response.data;
};

export const getCampaignItems = async (campaignId: string) => {
    const response = await api.get(`/api/v1/campaigns/${campaignId}/items`);
    return response.data;
};

export const getReviewItems = async (reviewerId: string) => {
    const response = await api.get('/api/v1/campaigns/items', { params: { reviewer_id: reviewerId } });
    return response.data;
};

export const approveItem = async (campaignId: string, itemId: string, comment: string) => {
    const response = await api.post(`/api/v1/campaigns/${campaignId}/items/${itemId}/approve`, { comment });
    return response.data;
};

export const revokeItem = async (campaignId: string, itemId: string, comment: string) => {
    const response = await api.post(`/api/v1/campaigns/${campaignId}/items/${itemId}/revoke`, { comment });
    return response.data;
};

// SSO Providers
export const getSSOProviders = async () => {
    const response = await api.get('/api/v1/sso/providers');
    return response.data;
};

export const createSSOProvider = async (provider: Record<string, any>) => {
    const response = await api.post('/api/v1/sso/providers', provider);
    return response.data;
};

export const updateSSOProvider = async (id: string, provider: Record<string, any>) => {
    const response = await api.put(`/api/v1/sso/providers/${id}`, provider);
    return response.data;
};

export const deleteSSOProvider = async (id: string) => {
    await api.delete(`/api/v1/sso/providers/${id}`);
};

export const toggleSSOProvider = async (id: string, enabled: boolean) => {
    const response = await api.post(`/api/v1/sso/providers/${id}/toggle`, { enabled });
    return response.data;
};

// Connectors
export const getConnectors = async () => {
    const response = await api.get('/api/v1/connectors');
    return response.data;
};

export const createConnector = async (config: Record<string, any>) => {
    const response = await api.post('/api/v1/connectors', config);
    return response.data;
};

export const updateConnector = async (id: string, config: Record<string, any>) => {
    const response = await api.put(`/api/v1/connectors/${id}`, config);
    return response.data;
};

export const deleteConnector = async (id: string) => {
    await api.delete(`/api/v1/connectors/${id}`);
};

export const toggleConnector = async (id: string, enabled: boolean) => {
    const response = await api.post(`/api/v1/connectors/${id}/toggle`, { enabled });
    return response.data;
};

export const testConnector = async (config: Record<string, any>) => {
    const response = await api.post('/api/v1/connectors/test', config);
    return response.data;
};

// Branding
export interface BrandingConfig {
    tenant_id: string;
    logo_url: string;
    primary_color: string;
    background_color: string;
    css_override: string;
    config: Record<string, any>;
}

export const getBranding = async (tenantID?: string) => {
    const url = tenantID ? `/branding/public/${tenantID}` : '/api/v1/branding';
    const response = await api.get(url);
    return response.data;
};

export const updateBranding = async (config: BrandingConfig) => {
    const response = await api.put('/api/v1/branding', config);
    return response.data;
};

// Social Login
export const socialLogin = async (provider: string, email?: string, external_id?: string) => {
    const response = await api.post('/social/login', {
        provider,
        email,
        external_id
    });
    return response.data;
};

// Webhooks
export const getWebhooks = async () => {
    const response = await api.get('/webhooks');
    return response.data;
};

export const createWebhook = async (url: string, events: string[]) => {
    const response = await api.post('/webhooks', { url, events });
    return response.data;
};

export const deleteWebhook = async (id: string) => {
    await api.delete(`/webhooks/${id}`);
};

// Device Management
export const getDevices = async () => {
    const response = await api.get('/api/v1/devices');
    return response.data;
};

export const deleteDevice = async (id: string) => {
    await api.delete(`/api/v1/devices/${id}`);
};

// Organizations
export const getOrganizations = async () => {
    const response = await api.get('/api/v1/organizations');
    return response.data;
};

export const createOrganization = async (org: { name: string; display_name?: string; domain?: string }) => {
    const response = await api.post('/api/v1/organizations', org);
    return response.data;
};

export const deleteOrganization = async (id: string) => {
    await api.delete(`/api/v1/organizations/${id}`);
    return;
};

export default api;
