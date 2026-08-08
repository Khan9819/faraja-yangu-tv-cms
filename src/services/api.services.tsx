import BaseService from "./base.services";

export default class API extends BaseService {

    constructor(controller?: AbortController | null | undefined) {
        super(controller);
    }

    async getDashboard() {
        let response = await this.axiosInstance.get(`/management/summary/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    // Advertising endpoints
    async getCarouselAds(ad_render_type?: 'CUSTOM' | 'GOOGLE') {
        const params = ad_render_type ? { ad_render_type } : {};
        let response = await this.axiosInstance.get(`/advertising/get-carousel-ads/`,
            {
                headers: this.headers,
                params,
            })

        return response.data;
    }

    async getCarouselAd(id: number) {
        let response = await this.axiosInstance.get(`/advertising/get-carousel-ad/${id}/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async createCarouselAd(data: FormData) {
        let response = await this.axiosInstance.post(`/advertising/create-carousel-ad/`, data)

        return response.data;
    }

    async updateCarouselAd(id: number, data: FormData) {
        let response = await this.axiosInstance.patch(`/advertising/update-carousel-ad/${id}/`, data)

        return response.data;
    }

    async deleteCarouselAd(id: number) {
        let response = await this.axiosInstance.delete(`/advertising/delete-carousel-ad/${id}/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async getCommentConversations(search?: string) {
        const params: any = {};
        if (search) params.search = search;
        let response = await this.axiosInstance.get(`/management/comment-conversations/`,
            {
                headers: this.headers,
                params,
            })

        return response.data;
    }

    async getCommentConversation(userId: number, videoId: number) {
        let response = await this.axiosInstance.get(`/management/comment-conversations/${userId}/${videoId}/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async replyToComment(commentId: number, text: string) {
        let response = await this.axiosInstance.post(`/streaming/cms/comments/${commentId}/reply/`,
            { text },
            {
                headers: this.headers,
            })

        return response.data;
    }

    async getDashboardClientStats() {
        let response = await this.axiosInstance.get(`/management/clients-stats/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async getDashboardAnalyticsChart(month?: number) {
        const params = month ? { month } : {};
        let response = await this.axiosInstance.get(`/management/dashboard-analytics-chart/`,
            {
                headers: this.headers,
                params,
            })

        return response.data;
    }

    async getCategories(type?: 'all' | 'parent' | 'children') {
        const params = type ? { type } : {};
        let response = await this.axiosInstance.get(`/streaming/categories/`,
            {
                headers: this.headers,
                params,
            })

        return response.data;
    }

    async getSubCategories(id: number) {
        let response = await this.axiosInstance.get(`/streaming/subcategories/${id}/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async getCategoryContent(id: number) {
        let response = await this.axiosInstance.get(`/streaming/categories/${id}/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async createCategory(data: FormData) {
        let response = await this.axiosInstance.post(`/streaming/create-category/`, data)

        return response.data;
    }

    async updateCategory(id: number, data: FormData) {
        let response = await this.axiosInstance.put(`/streaming/update-category/${id}/`, data)

        return response.data;
    }

    async deleteCategory(id: number) {
        let response = await this.axiosInstance.delete(`/streaming/categories/${id}/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    // Video endpoints
    async getVideos(params?: any) {
        let response = await this.axiosInstance.get(`/streaming/get-all-videos/`,
            {
                headers: this.headers,
                params,
            })

        return response.data;
    }

    async getVideoById(id: number) {
        let response = await this.axiosInstance.get(`/streaming/get-video/${id}/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async getVideoStreamUrl(id: number | string) {
        let response = await this.axiosInstance.get(`/streaming/stream/${id}/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async getChunkUploadUrl(videoId: number, chunkIndex: number, totalChunks: number) {
        let response = await this.axiosInstance.post(`/streaming/get-chunk-upload-url/`, 
            {
                videoId,
                chunkIndex,
                totalChunks
            },
            {
                headers: this.headers,
            })

        return response.data;
    }

    async createVideo(data: FormData) {
        let response = await this.axiosInstance.post(`/streaming/create-video/`, data)

        return response.data;
    }

    async updateVideo(id: number, data: FormData) {
        let response = await this.axiosInstance.put(`/streaming/update-video/${id}/`, data)

        return response.data;
    }

    async deleteVideo(id: number) {
        let response = await this.axiosInstance.delete(`/streaming/delete-video/${id}/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    
    async directUploadVideoChunk(uploadUrl: string, chunk: Blob, requiredHeaders: Record<string, string> = { 'Content-Type': 'application/octet-stream' }) {
        // Timeout is CRITICAL: a raw fetch() without one hangs forever when the
        // R2 PUT stalls, so the upload looks "cut" and the retry logic in
        // studio.tsx never runs (a hang never throws). 3 minutes per 5MB chunk
        // is generous for slow uplinks. We use a manual AbortController +
        // setTimeout (not AbortSignal.timeout) so it works on older browsers
        // (Safari < 16, Chrome < 103). On abort fetch throws a DOMException
        // with no response, which the retry loop treats as retryable.
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 180000);
        try {
            const response = await fetch(uploadUrl, {
                method: 'PUT',
                body: chunk,
                headers: requiredHeaders,
                signal: controller.signal,
            });

            if (!response.ok) {
                const error: any = new Error(`Upload failed with status ${response.status}`);
                error.response = { status: response.status };
                throw error;
            }

            return response;
        } finally {
            clearTimeout(timer);
        }
    }

    async getUploadStatus(videoId: number, totalChunks: number) {
        let response = await this.axiosInstance.get(`/streaming/get-upload-status/`,
            {
                headers: this.headers,
                params: { videoId, totalChunks },
            })

        return response.data;
    }

    async uploadVideoChunk(data: FormData) {
        let response = await this.axiosInstance.post(`/streaming/upload-chunk/`, data,
            {
                headers: {
                    ...this.headers,
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 120000, // 2 minutes timeout per chunk
            })

        return response.data;
    }

    async assembleVideoChunks(videoId: number, fileName: string) {
        let response = await this.axiosInstance.post(`/streaming/assemble-chunks/`, 
            {
                videoId,
                fileName
            },
            {
                headers: this.headers,
            })

        return response.data;
    }

    // Interceptor Ads endpoints
    async getInterceptorAds() {
        let response = await this.axiosInstance.get(`/management/interceptor/ads/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async createInterceptorAd(data: FormData) {
        let response = await this.axiosInstance.post(`/management/interceptor/ads/create/`, data)

        return response.data;
    }

    async getInterceptorAd(id: number) {
        let response = await this.axiosInstance.get(`/management/interceptor/ad/${id}/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async updateInterceptorAd(id: number, data: FormData) {
        let response = await this.axiosInstance.put(`/management/interceptor/ads/${id}/update/`, data)

        return response.data;
    }

    async toggleInterceptorAdStatus(id: number, is_active: boolean) {
        let response = await this.axiosInstance.patch(`/management/interceptor/ads/${id}/toggle/`,
            { is_active },
            {
                headers: this.headers,
            })

        return response.data;
    }

    async importVideoFromGoogleDrive(videoId: number, googleDriveUrl: string) {
        let response = await this.axiosInstance.post(`/streaming/import-from-google-drive/`, 
            {
                videoId,
                google_drive_url: googleDriveUrl,
            },
            {
                headers: this.headers,
            })

        return response.data;
    }

    async getGoogleDriveImportStatus(videoId: number) {
        let response = await this.axiosInstance.get(`/streaming/google-drive-import-status/`,
            {
                headers: this.headers,
                params: { videoId },
            })

        return response.data;
    }

    async deleteInterceptorAd(id: number) {
        let response = await this.axiosInstance.delete(`/management/interceptor/ads/${id}/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    // ==================== App Users endpoints ==================== //

    async getAppUsers(params?: { page?: number; page_size?: number; search?: string; status?: string; plan?: string }) {
        let response = await this.axiosInstance.get(`/management/app-users/`,
            {
                headers: this.headers,
                params,
            })

        return response.data;
    }

    async getAppUser(id: number) {
        let response = await this.axiosInstance.get(`/management/app-users/${id}/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async suspendAppUser(id: number) {
        let response = await this.axiosInstance.patch(`/management/app-users/${id}/suspend/`, {},
            {
                headers: this.headers,
            })

        return response.data;
    }

    async unsuspendAppUser(id: number) {
        let response = await this.axiosInstance.patch(`/management/app-users/${id}/unsuspend/`, {},
            {
                headers: this.headers,
            })

        return response.data;
    }

    // ==================== Admin Users endpoints ==================== //

    async getAdminUsers() {
        let response = await this.axiosInstance.get(`/management/admin-users/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async createAdminUser(data: any) {
        let response = await this.axiosInstance.post(`/management/admin-users/create/`, data,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async updateAdminUser(id: number, data: any) {
        let response = await this.axiosInstance.patch(`/management/admin-users/${id}/update/`, data,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async deleteAdminUser(id: number) {
        let response = await this.axiosInstance.delete(`/management/admin-users/${id}/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    // ==================== Profile endpoints ==================== //

    async getProfile() {
        let response = await this.axiosInstance.get(`/authentication/profile/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async updateProfile(data: any) {
        let response = await this.axiosInstance.patch(`/authentication/profile/update/`, data,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async changePassword(data: { current_password: string; new_password: string; confirm_password: string }) {
        let response = await this.axiosInstance.post(`/authentication/change-password/`, data,
            {
                headers: this.headers,
            })

        return response.data;
    }

    // ==================== Notifications endpoints ==================== //

    async getNotifications(params?: { page?: number; page_size?: number }) {
        let response = await this.axiosInstance.get(`/management/notifications/`,
            {
                headers: this.headers,
                params,
            })

        return response.data;
    }

    async markNotificationRead(id: number) {
        let response = await this.axiosInstance.patch(`/management/notifications/${id}/read/`, {},
            {
                headers: this.headers,
            })

        return response.data;
    }

    async markAllNotificationsRead() {
        let response = await this.axiosInstance.post(`/management/notifications/read-all/`, {},
            {
                headers: this.headers,
            })

        return response.data;
    }

    // ==================== Reports / Analytics endpoints ==================== //

    async getReportsSummary() {
        let response = await this.axiosInstance.get(`/management/reports/summary/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async getTopVideos(params?: { limit?: number; period?: string }) {
        let response = await this.axiosInstance.get(`/management/reports/top-videos/`,
            {
                headers: this.headers,
                params,
            })

        return response.data;
    }

    async getCategoryPerformance() {
        let response = await this.axiosInstance.get(`/management/reports/category-performance/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    // ==================== Settings endpoints ==================== //

    async getSettings() {
        let response = await this.axiosInstance.get(`/management/settings/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async updateSettings(data: any) {
        let response = await this.axiosInstance.patch(`/management/settings/`, data,
            {
                headers: this.headers,
            })

        return response.data;
    }

    // ==================== Dashboard - Active Users Today ==================== //

    async getActiveUsersToday() {
        let response = await this.axiosInstance.get(`/management/active-users-today/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    // ==================== Comments endpoints ==================== //

    async getRecentComments(params?: { limit?: number }) {
        let response = await this.axiosInstance.get(`/streaming/comments/recent/`,
            {
                headers: this.headers,
                params,
            })

        return response.data;
    }

    async getVideoComments(videoId: number, params?: { page?: number; page_size?: number }) {
        let response = await this.axiosInstance.get(`/streaming/videos/${videoId}/comments/`,
            {
                headers: this.headers,
                params,
            })

        return response.data;
    }

    async getUserComments(userId: number, params?: { page?: number; page_size?: number }) {
        let response = await this.axiosInstance.get(`/management/app-users/${userId}/comments/`,
            {
                headers: this.headers,
                params,
            })

        return response.data;
    }

    async deleteComment(commentId: number) {
        let response = await this.axiosInstance.delete(`/streaming/cms/comments/${commentId}/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async getCommentReplies(commentId: number) {
        let response = await this.axiosInstance.get(`/streaming/cms/comments/${commentId}/replies/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    // ==================== Video Viewers endpoints ==================== //

    async getVideoViewers(videoId: number, params?: { page?: number; page_size?: number }) {
        let response = await this.axiosInstance.get(`/streaming/videos/${videoId}/viewers/`,
            {
                headers: this.headers,
                params,
            })

        return response.data;
    }

    // ==================== Website Posts endpoints ==================== //

    async getWebsitePosts() {
        let response = await this.axiosInstance.get(`/management/website-posts/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async createWebsitePost(data: FormData) {
        let response = await this.axiosInstance.post(`/management/website-posts/create/`, data)

        return response.data;
    }

    async getWebsitePost(id: number) {
        let response = await this.axiosInstance.get(`/management/website-posts/${id}/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    async updateWebsitePost(id: number, data: FormData) {
        let response = await this.axiosInstance.patch(`/management/website-posts/${id}/update/`, data)

        return response.data;
    }

    async deleteWebsitePost(id: number) {
        let response = await this.axiosInstance.delete(`/management/website-posts/${id}/delete/`,
            {
                headers: this.headers,
            })

        return response.data;
    }

    // ==================== Video Interactions endpoints ==================== //

    async getVideoInteractions(videoId: number) {
        let response = await this.axiosInstance.get(`/streaming/videos/${videoId}/interactions/`,
            {
                headers: this.headers,
            })

        return response.data;
    }
}