<?php

namespace App\Tests\Api;

use App\Entity\User;

final class ApiAuthTest extends ApiTestCase
{
    private ?User $testUser = null;

    protected function tearDown(): void
    {
        if ($this->testUser instanceof User) {
            $this->purgeTestUser($this->testUser);
            $this->testUser = null;
        }

        parent::tearDown();
    }

    public function testMeUnauthenticated(): void
    {
        $data = $this->api('GET', '/api/auth/me');

        $this->assertSame(200, $this->responseCode());
        $this->assertFalse($data['authenticated']);
    }

    public function testRegisterSuccess(): void
    {
        $email = uniqid('reg.') . '@test.local';

        $data = $this->api('POST', '/api/auth/register', [
            'email' => $email,
            'password' => 'P@ssword1test',
            'displayName' => 'Test User',
        ]);

        $this->assertSame(201, $this->responseCode());
        $this->assertTrue($data['authenticated']);

        $this->testUser = $this->em->getRepository(User::class)->findOneBy(['email' => $email]);
        $this->assertInstanceOf(User::class, $this->testUser);
    }

    public function testRegisterDuplicateEmail(): void
    {
        $email = uniqid('dup.') . '@test.local';
        $this->testUser = $this->makeUser(email: $email);

        $data = $this->api('POST', '/api/auth/register', [
            'email' => $email,
            'password' => 'P@ssword1test',
        ]);

        $this->assertSame(409, $this->responseCode());
        $this->assertArrayHasKey('message', $data);
    }

    public function testRegisterPasswordTooShort(): void
    {
        $data = $this->api('POST', '/api/auth/register', [
            'email' => uniqid('short.') . '@test.local',
            'password' => '1234',
        ]);

        $this->assertSame(400, $this->responseCode());
        $this->assertArrayHasKey('message', $data);
    }

    public function testRegisterMissingFields(): void
    {
        $data = $this->api('POST', '/api/auth/register', [
            'email' => '',
            'password' => '',
        ]);

        $this->assertSame(400, $this->responseCode());
        $this->assertArrayHasKey('message', $data);
    }

    public function testLoginSuccess(): void
    {
        $email = uniqid('login.') . '@test.local';
        $password = 'P@ssword1test';
        $this->testUser = $this->makeUser(email: $email, password: $password);

        $data = $this->api('POST', '/api/auth/login', [
            'email' => $email,
            'password' => $password,
        ]);

        $this->assertSame(200, $this->responseCode());
        $this->assertTrue($data['authenticated']);

        $me = $this->api('GET', '/api/auth/me');
        $this->assertSame(200, $this->responseCode());
        $this->assertTrue($me['authenticated']);
        $this->assertSame($email, $me['user']['email']);
    }

    public function testLoginInvalidCredentials(): void
    {
        $email = uniqid('badlogin.') . '@test.local';
        $this->testUser = $this->makeUser(email: $email, password: 'CorrectP@ss1');

        $data = $this->api('POST', '/api/auth/login', [
            'email' => $email,
            'password' => 'WrongP@ss1',
        ]);

        $this->assertSame(401, $this->responseCode());
        $this->assertArrayHasKey('message', $data);
    }
}
