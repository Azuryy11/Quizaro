<?php

namespace App\Tests\Api;

use App\Entity\User;

class ApiStatusTest extends ApiTestCase
{
    private ?User $profileUser = null;

    protected function tearDown(): void
    {
        if ($this->profileUser) {
            $this->purgeTestUser($this->profileUser);
            $this->profileUser = null;
        }

        parent::tearDown();
    }

    public function testStatusReturnsOk(): void
    {
        $data = $this->api('GET', '/api/status');

        $this->assertSame(200, $this->responseCode());
        $this->assertSame('ok', $data['status']);
        $this->assertSame('Quizaro API', $data['app']);
        $this->assertFalse($data['authenticated']);
    }

    public function testStatusAuthenticatedFlag(): void
    {
        $user = $this->profileUser = $this->makeUser();
        $this->client->loginUser($user);

        $data = $this->api('GET', '/api/status');

        $this->assertSame(200, $this->responseCode());
        $this->assertTrue($data['authenticated']);
    }

    public function testHomeReturnsTitle(): void
    {
        $data = $this->api('GET', '/api/home');

        $this->assertSame(200, $this->responseCode());
        $this->assertSame('Bienvenue sur Quizaro', $data['title']);
        $this->assertFalse($data['authenticated']);
        $this->assertArrayHasKey('cta', $data);
    }

    public function testProfileUnauthenticated(): void
    {
        $data = $this->api('GET', '/api/profile');

        $this->assertSame(200, $this->responseCode());
        $this->assertFalse($data['authenticated']);
    }

    public function testProfileAuthenticated(): void
    {
        $user = $this->profileUser = $this->makeUser(email: 'profile.test@test.local', displayName: 'Alice Test');
        $this->client->loginUser($user);

        $data = $this->api('GET', '/api/profile');

        $this->assertSame(200, $this->responseCode());
        $this->assertTrue($data['authenticated']);
        $this->assertSame('profile.test@test.local', $data['email']);
        $this->assertSame('Alice Test', $data['displayName']);
        $this->assertArrayHasKey('roles', $data);
        $this->assertArrayHasKey('quizzesCount', $data);
    }
}
